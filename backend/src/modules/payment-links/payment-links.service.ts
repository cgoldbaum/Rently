import { AppError } from '../../lib/AppError';
import prisma from '../../lib/prisma';
import { createNotification } from '../../lib/notify';
import { getAppUrl, getApiUrl, isLocalUrl, getPaymentsMode } from '../../lib/helpers';

async function assertPropertyOwnership(propertyId: string, userId: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new AppError('Property not found', 404, 'NOT_FOUND');
  if (property.userId !== userId) throw new AppError('Access denied', 403, 'FORBIDDEN');
  return property;
}

export async function createPaymentLink(propertyId: string, userId: string, input: {
  amount: number; period: string; description?: string; currency?: 'ARS' | 'USD';
}) {
  await assertPropertyOwnership(propertyId, userId);
  const contract = await prisma.contract.findUnique({
    where: { propertyId },
    select: { currency: true },
  });
  const currency = input.currency ?? contract?.currency ?? 'USD';

  if (getPaymentsMode() === 'mock') {
    const preferenceId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const initPoint = `${getAppUrl()}/public/mercadopago-demo?linkId=${preferenceId}`;

    const link = await prisma.paymentLink.create({
      data: {
        propertyId,
        mpPreferenceId: preferenceId,
        mpInitPoint: initPoint,
        amount: input.amount,
        currency,
        period: input.period,
        description: input.description,
      },
    });

    return { link, initPoint, preferenceId, mode: 'mock' };
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new AppError('Mercado Pago no está configurado. Agregá MERCADOPAGO_ACCESS_TOKEN al .env o usá PAYMENTS_MODE=mock', 503, 'MP_NOT_CONFIGURED');
  }

  const appUrl = getAppUrl();
  const body: Record<string, unknown> = {
    items: [{
      title: input.description || `Alquiler ${input.period}`,
      quantity: 1,
      unit_price: input.amount,
      currency_id: currency,
    }],
    back_urls: {
      success: `${appUrl}/payments?status=success`,
      failure: `${appUrl}/payments?status=failure`,
      pending: `${appUrl}/payments?status=pending`,
    },
    external_reference: propertyId,
    notification_url: `${getApiUrl()}/webhooks/mercadopago`,
  };

  if (!isLocalUrl(appUrl)) {
    body.auto_return = 'approved';
  }

  const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });

  if (!mpRes.ok) {
    const err = await mpRes.text();
    throw new AppError(`Error de Mercado Pago: ${err}`, 502, 'MP_ERROR');
  }

  const mpData = await mpRes.json() as { id: string; init_point: string; sandbox_init_point?: string };
  const initPoint = getPaymentsMode() === 'sandbox' && mpData.sandbox_init_point ? mpData.sandbox_init_point : mpData.init_point;

  const link = await prisma.paymentLink.create({
    data: {
      propertyId,
      mpPreferenceId: mpData.id,
      mpInitPoint: initPoint,
      amount: input.amount,
      currency,
      period: input.period,
      description: input.description,
    },
  });

  return { link, initPoint, preferenceId: mpData.id, mode: getPaymentsMode() };
}

export async function listPaymentLinks(propertyId: string, userId: string) {
  await assertPropertyOwnership(propertyId, userId);
  return prisma.paymentLink.findMany({ where: { propertyId }, orderBy: { createdAt: 'desc' } });
}

export async function getPublicMockPaymentLink(preferenceId: string) {
  if (getPaymentsMode() !== 'mock') {
    throw new AppError('El checkout demo no está habilitado', 404, 'MOCK_DISABLED');
  }

  const link = await prisma.paymentLink.findFirst({
    where: { mpPreferenceId: preferenceId },
    include: {
      property: {
        include: {
          contract: { include: { tenants: true } },
        },
      },
    },
  });

  if (!link) throw new AppError('Link de pago no encontrado', 404, 'NOT_FOUND');

  return {
    id: link.id,
    preferenceId: link.mpPreferenceId,
    amount: link.amount,
    currency: link.currency,
    period: link.period,
    description: link.description,
    status: link.status,
    property: {
      name: link.property.name,
      address: link.property.address,
    },
    tenant: link.property.contract?.tenants.length ? { name: link.property.contract.tenants.map((t) => t.name).join(', ') } : null,
  };
}

export async function confirmPublicMockPayment(preferenceId: string) {
  if (getPaymentsMode() !== 'mock') {
    throw new AppError('El checkout demo no está habilitado', 404, 'MOCK_DISABLED');
  }

  const link = await prisma.paymentLink.findFirst({
    where: { mpPreferenceId: preferenceId },
    include: {
      property: {
        include: {
          contract: { include: { tenants: true } },
        },
      },
    },
  });

  if (!link) throw new AppError('Link de pago no encontrado', 404, 'NOT_FOUND');
  if (!link.property.contract) {
    throw new AppError('La propiedad no tiene contrato activo', 400, 'NO_CONTRACT');
  }

  if (link.status === 'PAID') {
    return { status: 'PAID', message: 'Este pago ya estaba confirmado' };
  }

  await prisma.paymentLink.update({ where: { id: link.id }, data: { status: 'PAID' } });

  const payment = await prisma.payment.create({
    data: {
      contractId: link.property.contract.id,
      amount: link.amount,
      currency: link.currency,
      period: link.period,
      dueDate: new Date(),
      paidDate: new Date(),
      status: 'PAID',
      method: 'Mercado Pago',
    },
  });

  await createNotification({
    userId: link.property.userId,
    type: 'PAYMENT',
    message: `Pago demo recibido por Mercado Pago: ${link.property.name ?? link.property.address} - ${link.currency === 'USD' ? 'USD ' : '$'}${link.amount.toLocaleString('es-AR')}`,
    referenceId: payment.id,
  });

  return { status: 'PAID', payment };
}
