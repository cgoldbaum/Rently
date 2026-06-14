import { AppError } from '../../lib/AppError';
import prisma from '../../lib/prisma';
import { SubscriptionPlanCodeInput } from './subscriptions.schema';
import { getAppUrl, addMonths, currencySymbol } from '../../lib/helpers';

const GRACE_DAYS = 7;

function getApiUrl() {
  const localApiUrl = `http://localhost:${process.env.PORT || 4000}`;
  if (process.env.API_URL === 'http://localhost:4000' && process.env.PORT && process.env.PORT !== '4000') {
    return localApiUrl;
  }
  return process.env.API_URL || localApiUrl;
}

function getPaymentsMode() {
  return (process.env.PAYMENTS_MODE || 'mock').toLowerCase();
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function getOwner(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
  if (user.role !== 'OWNER') {
    throw new AppError('Los inquilinos no requieren suscripción', 400, 'TENANT_SUBSCRIPTION_NOT_REQUIRED');
  }
  return user;
}

async function getCurrentSubscription(userId: string) {
  return prisma.ownerSubscription.findFirst({
    where: { userId, status: { in: ['ACTIVE', 'PENDING', 'PAST_DUE'] } },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function ensureDefaultPlans() {
  const plans = [
    { code: 'STARTER' as const, name: 'Starter', description: 'Para empezar con una propiedad', propertyLimit: 1, price: 6000 },
    { code: 'PRO' as const, name: 'Pro', description: 'Para carteras de hasta 10 propiedades', propertyLimit: 10, price: 20000 },
    { code: 'AGENCY' as const, name: 'Agency', description: 'Para administrar carteras grandes', propertyLimit: null, price: 50000 },
  ];

  await Promise.all(plans.map((plan) =>
    prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: { ...plan, currency: 'ARS', active: true },
      create: { ...plan, currency: 'ARS' },
    })
  ));
}

export async function listPlans() {
  await ensureDefaultPlans();
  return prisma.subscriptionPlan.findMany({
    where: { active: true },
    orderBy: [{ price: 'asc' }],
  });
}

export async function getSubscriptionSummary(userId: string) {
  await ensureDefaultPlans();
  const [propertyCount, subscription, plans] = await Promise.all([
    prisma.property.count({ where: { userId } }),
    getCurrentSubscription(userId),
    listPlans(),
  ]);

  const now = new Date();
  const plan = subscription?.plan ?? null;
  const limit = plan?.propertyLimit ?? null;
  const isWithinLimit = limit == null || propertyCount < limit;
  const isGraceActive = subscription?.status === 'PAST_DUE' && !!subscription.graceUntil && subscription.graceUntil >= now;
  const isBillingUsable = subscription?.status === 'ACTIVE' || isGraceActive;
  const canCreateProperty = Boolean(subscription && isBillingUsable && isWithinLimit);

  let blockingReason: string | null = null;
  if (!subscription) blockingReason = 'SUBSCRIPTION_REQUIRED';
  else if (subscription.status === 'PENDING') blockingReason = 'SUBSCRIPTION_PENDING';
  else if (subscription.status === 'PAST_DUE' && !isGraceActive) blockingReason = 'SUBSCRIPTION_PAST_DUE';
  else if (!isWithinLimit) blockingReason = 'PROPERTY_LIMIT_REACHED';
  else if (!isBillingUsable) blockingReason = 'SUBSCRIPTION_REQUIRED';

  return {
    subscription: subscription ? {
      id: subscription.id,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      graceUntil: subscription.graceUntil,
      initPoint: subscription.initPoint,
      plan: {
        id: plan!.id,
        code: plan!.code,
        name: plan!.name,
        description: plan!.description,
        propertyLimit: plan!.propertyLimit,
        price: plan!.price,
        currency: plan!.currency,
      },
    } : null,
    usage: {
      properties: propertyCount,
      propertyLimit: limit,
      canCreateProperty,
      blockingReason,
    },
    plans,
  };
}

export async function assertCanCreateProperty(userId: string) {
  const summary = await getSubscriptionSummary(userId);
  if (summary.usage.canCreateProperty) return summary;

  const reason = summary.usage.blockingReason ?? 'SUBSCRIPTION_REQUIRED';
  const messages: Record<string, string> = {
    SUBSCRIPTION_REQUIRED: 'Necesitás un plan activo para crear propiedades.',
    SUBSCRIPTION_PENDING: 'Tu suscripción todavía está pendiente de pago.',
    SUBSCRIPTION_PAST_DUE: 'Tu suscripción está vencida. Regularizá el pago para crear más propiedades.',
    PROPERTY_LIMIT_REACHED: 'Llegaste al límite de propiedades de tu plan.',
  };

  throw new AppError(messages[reason] ?? messages.SUBSCRIPTION_REQUIRED, 402, reason, summary);
}

async function activateSubscription(subscriptionId: string, providerSubscriptionId?: string, rawPayload?: unknown) {
  const subscription = await prisma.ownerSubscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });
  if (!subscription) return null;

  const now = new Date();
  const periodEnd = addMonths(now, 1);

  return prisma.$transaction(async (tx) => {
    await tx.ownerSubscription.updateMany({
      where: { userId: subscription.userId, id: { not: subscription.id }, status: { in: ['ACTIVE', 'PENDING', 'PAST_DUE'] } },
      data: { status: 'CANCELED', canceledAt: now },
    });

    const updated = await tx.ownerSubscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        providerSubscriptionId: providerSubscriptionId ?? subscription.providerSubscriptionId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        graceUntil: null,
      },
      include: { plan: true },
    });

    await tx.subscriptionPayment.create({
      data: {
        userId: updated.userId,
        subscriptionId: updated.id,
        providerPaymentId: providerSubscriptionId,
        status: 'APPROVED',
        amount: updated.plan.price,
        currency: updated.plan.currency,
        rawPayload: rawPayload as object | undefined,
        paidAt: now,
      },
    });

    return updated;
  });
}

export async function createCheckout(userId: string, planCode: SubscriptionPlanCodeInput) {
  const user = await getOwner(userId);
  await ensureDefaultPlans();
  const plan = await prisma.subscriptionPlan.findUnique({ where: { code: planCode } });
  if (!plan || !plan.active) {
    throw new AppError('Plan no encontrado', 404, 'PLAN_NOT_FOUND');
  }

  const subscription = await prisma.ownerSubscription.create({
    data: {
      userId,
      planId: plan.id,
      status: 'PENDING',
      provider: 'mercadopago',
    },
    include: { plan: true },
  });

  if (getPaymentsMode() === 'mock') {
    const initPoint = `${getAppUrl()}/public/mercadopago-demo?subscriptionId=${subscription.id}`;
    const updated = await prisma.ownerSubscription.update({
      where: { id: subscription.id },
      data: { initPoint, providerSubscriptionId: `mock-sub-${subscription.id}` },
      include: { plan: true },
    });
    return { subscription: updated, initPoint, mode: 'mock' };
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new AppError('Mercado Pago no está configurado. Agregá MERCADOPAGO_ACCESS_TOKEN al .env o usá PAYMENTS_MODE=mock', 503, 'MP_NOT_CONFIGURED');
  }

  const body = {
    reason: `Rently ${plan.name}`,
    external_reference: `subscription:${subscription.id}`,
    payer_email: user.email,
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: plan.price,
      currency_id: plan.currency,
    },
    back_url: `${getAppUrl()}/settings?subscription=success`,
    notification_url: `${getApiUrl()}/webhooks/mercadopago`,
    status: 'pending',
  };

  const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });

  if (!mpRes.ok) {
    const err = await mpRes.text();
    throw new AppError(`Error de Mercado Pago: ${err}`, 502, 'MP_ERROR');
  }

  const mpData = await mpRes.json() as { id: string; init_point?: string; sandbox_init_point?: string };
  const initPoint = getPaymentsMode() === 'sandbox' && mpData.sandbox_init_point ? mpData.sandbox_init_point : mpData.init_point;

  const updated = await prisma.ownerSubscription.update({
    where: { id: subscription.id },
    data: { providerSubscriptionId: mpData.id, initPoint },
    include: { plan: true },
  });

  return { subscription: updated, initPoint, mode: getPaymentsMode() };
}

export async function cancelSubscription(userId: string) {
  await getOwner(userId);
  const subscription = await getCurrentSubscription(userId);
  if (!subscription) {
    throw new AppError('No tenés una suscripción activa', 404, 'SUBSCRIPTION_NOT_FOUND');
  }

  if (subscription.providerSubscriptionId && getPaymentsMode() !== 'mock' && process.env.MERCADOPAGO_ACCESS_TOKEN) {
    await fetch(`https://api.mercadopago.com/preapproval/${subscription.providerSubscriptionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
      body: JSON.stringify({ status: 'cancelled' }),
    }).catch(() => undefined);
  }

  return prisma.ownerSubscription.update({
    where: { id: subscription.id },
    data: { status: 'CANCELED', canceledAt: new Date() },
    include: { plan: true },
  });
}

export async function markPastDue(subscriptionId: string, rawPayload?: unknown) {
  const subscription = await prisma.ownerSubscription.findUnique({ where: { id: subscriptionId } });
  if (!subscription) return null;
  return prisma.ownerSubscription.update({
    where: { id: subscription.id },
    data: { status: 'PAST_DUE', graceUntil: addDays(new Date(), GRACE_DAYS) },
  });
}

export async function handleMercadoPagoSubscriptionPayment(mpPayment: {
  id: string | number;
  status: string;
  external_reference?: string;
}) {
  if (!mpPayment.external_reference?.startsWith('subscription:')) return false;
  const subscriptionId = mpPayment.external_reference.replace('subscription:', '');

  if (mpPayment.status === 'approved' || mpPayment.status === 'authorized') {
    await activateSubscription(subscriptionId, String(mpPayment.id), mpPayment);
    return true;
  }

  if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(mpPayment.status)) {
    await markPastDue(subscriptionId, mpPayment);
    return true;
  }

  return true;
}

export async function getPublicMockSubscription(subscriptionId: string) {
  if (getPaymentsMode() !== 'mock') {
    throw new AppError('El checkout demo no está habilitado', 404, 'MOCK_DISABLED');
  }

  const subscription = await prisma.ownerSubscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true, user: true },
  });
  if (!subscription) throw new AppError('Suscripción no encontrada', 404, 'NOT_FOUND');

  return {
    id: subscription.id,
    status: subscription.status,
    amount: subscription.plan.price,
    currency: subscription.plan.currency,
    description: `Rently ${subscription.plan.name}`,
    property: {
      name: 'Rently',
      address: subscription.plan.propertyLimit == null
        ? 'Propiedades ilimitadas'
        : `Hasta ${subscription.plan.propertyLimit} propiedades`,
    },
    tenant: { name: subscription.user.name },
  };
}

export async function confirmPublicMockSubscription(subscriptionId: string) {
  if (getPaymentsMode() !== 'mock') {
    throw new AppError('El checkout demo no está habilitado', 404, 'MOCK_DISABLED');
  }

  const updated = await activateSubscription(subscriptionId, `mock-pay-${Date.now()}`, { mode: 'mock' });
  if (!updated) throw new AppError('Suscripción no encontrada', 404, 'NOT_FOUND');

  return {
    status: 'PAID',
    message: `Suscripción ${updated.plan.name} activada por ${currencySymbol(updated.plan.currency)}${updated.plan.price.toLocaleString('es-AR')}`,
    subscription: updated,
  };
}
