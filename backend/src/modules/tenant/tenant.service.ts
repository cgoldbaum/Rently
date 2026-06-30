import { AppError } from '../../lib/AppError';
import prisma from '../../lib/prisma';
import { ensurePaymentsForTenant } from '../payments/paymentSchedule';
import { sendPushToUser } from '../../lib/pushNotifications';
import { createNotification } from '../../lib/notify';
import { getAppUrl, getApiUrl, isLocalUrl, getPaymentsMode, currencySymbol, periodKey } from '../../lib/helpers';

function notFound(msg = 'Not found') {
  return new AppError(msg, 404, 'NOT_FOUND');
}
function forbidden(msg = 'Access denied') {
  return new AppError(msg, 403, 'FORBIDDEN');
}

function getOwnerPaymentInfo(owner: { email: string; phone?: string | null; name: string }) {
  return {
    alias: process.env.OWNER_TRANSFER_ALIAS || 'rently.demo.mp',
    cbu: process.env.OWNER_TRANSFER_CBU || '0000003100010000000001',
    email: process.env.OWNER_PAYMENT_EMAIL || owner.email,
    whatsapp: process.env.OWNER_PAYMENT_WHATSAPP || owner.phone || '',
    ownerName: owner.name,
  };
}

/** Lista todos los alquileres (perfiles de inquilino) del usuario para el selector de alquiler. */
export async function listRentals(userId: string) {
  const tenants = await prisma.tenant.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: {
      contract: {
        include: { property: { select: { id: true, name: true, address: true, type: true } } },
      },
    },
  });

  return tenants.map((t) => ({
    tenantId: t.id,
    propertyId: t.contract.property.id,
    propertyName: t.contract.property.name ?? t.contract.property.address,
    propertyAddress: t.contract.property.address,
    propertyType: t.contract.property.type,
    contractEndDate: t.contract.endDate,
  }));
}

export async function getContract(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      contract: {
        include: {
          property: { include: { user: true } },
          adjustmentHistory: { orderBy: { appliedAt: 'desc' }, take: 1 },
        },
      },
    },
  });

  if (!tenant?.contract) throw notFound('Sin contrato asignado');

  const { contract } = tenant;
  const now = Date.now();
  const start = contract.startDate.getTime();
  const end = contract.endDate.getTime();
  const progress = Math.round(Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)));

  return {
    property: { address: contract.property.address, type: contract.property.type },
    startDate: contract.startDate,
    endDate: contract.endDate,
    monthlyAmount: contract.currentAmount,
    currency: contract.currency,
    initialAmount: contract.initialAmount,
    adjustIndex: contract.indexType,
    adjustFrequency: contract.adjustFrequency,
    paymentDay: contract.paymentDay,
    nextAdjustDate: contract.nextAdjustDate,
    lastAdjustPct: contract.adjustmentHistory[0]?.variation ?? null,
    ownerPaymentInfo: getOwnerPaymentInfo(contract.property.user),
    progress,
  };
}

export async function getContractDocument(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { contractId: true },
  });
  if (!tenant?.contractId) throw notFound('Sin contrato asignado');
  const doc = await prisma.contractDocument.findUnique({
    where: { contractId: tenant.contractId },
  });
  if (!doc) throw notFound('No hay documento de contrato cargado');
  return doc;
}

export async function getPayments(
  tenantId: string,
  params: { status?: string; page?: number; limit?: number }
) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw notFound();
  await ensurePaymentsForTenant(tenantId);

  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { contractId: tenant.contractId };
  if (params.status) where.status = params.status.toUpperCase();

  const [data, total] = await Promise.all([
    prisma.payment.findMany({ where, orderBy: { dueDate: 'desc' }, skip, take: limit }),
    prisma.payment.count({ where }),
  ]);

  return { data, total, page };
}

export async function registerCashPayment(
  tenantId: string,
  input: { amount: number; date?: string; note?: string; paymentId?: string; method?: string }
) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      contract: {
        include: {
          payments: { where: { status: 'PENDING_CONFIRMATION' } },
          property: { include: { user: true } },
        },
      },
    },
  });

  if (!tenant?.contract) throw notFound('Sin contrato asignado');

  if (input.paymentId) {
    const existing = await prisma.payment.findUnique({ where: { id: input.paymentId } });
    if (!existing || existing.contractId !== tenant.contractId) throw forbidden();
    if (existing.status === 'PAID') {
      throw new AppError('Este pago ya está confirmado', 409, 'ALREADY_PAID');
    }

    const payment = await prisma.payment.update({
      where: { id: existing.id },
      data: {
        status: 'PENDING_CONFIRMATION',
        method: input.method || 'Efectivo',
        cashNote: input.note,
      },
    });

    const ownerId1 = tenant.contract.property.user.id;
    const msg1 = `${tenant.name} informó un pago por ${payment.method ?? 'Efectivo'} de ${currencySymbol(payment.currency)}${payment.amount.toLocaleString('es-AR')} para ${payment.period}`;
    await createNotification({ userId: ownerId1, type: 'PAYMENT', message: msg1, referenceId: payment.id });
    sendPushToUser(ownerId1, 'Pago informado', msg1, { type: 'payment', paymentId: payment.id });

    return payment;
  }

  if (tenant.contract.payments.length > 0) {
    throw new AppError('Ya existe un pago pendiente de confirmación para este período', 409, 'PENDING_EXISTS');
  }

  const now = new Date();
  const dueDate = new Date(now.getFullYear(), now.getMonth(), tenant.contract.paymentDay);
  const period = periodKey(dueDate);

  const payment = await prisma.payment.create({
    data: {
      contractId: tenant.contractId,
      amount: input.amount,
      currency: tenant.contract.currency,
      period,
      dueDate,
      status: 'PENDING_CONFIRMATION',
      method: input.method || 'Efectivo',
      cashNote: input.note,
    },
  });

  const ownerId2 = tenant.contract.property.user.id;
  const msg2 = `${tenant.name} registró un pago por ${payment.method ?? 'Efectivo'} de ${currencySymbol(payment.currency)}${input.amount.toLocaleString('es-AR')}`;
  await createNotification({ userId: ownerId2, type: 'PAYMENT', message: msg2, referenceId: payment.id });
  sendPushToUser(ownerId2, 'Pago informado', msg2, { type: 'payment', paymentId: payment.id });

  return payment;
}

export async function createMercadoPagoPayment(tenantId: string, paymentId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      contract: {
        include: {
          property: true,
        },
      },
    },
  });
  if (!tenant?.contract) throw notFound('Sin contrato asignado');

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { contract: { include: { property: true, tenants: true } } },
  });
  if (!payment || payment.contractId !== tenant.contractId) throw forbidden();
  if (payment.status === 'PAID') {
    throw new AppError('Este pago ya está confirmado', 409, 'ALREADY_PAID');
  }

  if (getPaymentsMode() === 'mock') {
    return {
      initPoint: `${getAppUrl()}/public/mercadopago-demo?paymentId=${payment.id}`,
      mode: 'mock',
    };
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new AppError('Mercado Pago no está configurado. Agregá MERCADOPAGO_ACCESS_TOKEN al .env o usá PAYMENTS_MODE=mock', 503, 'MP_NOT_CONFIGURED');
  }

  const appUrl = getAppUrl();
  const body: Record<string, unknown> = {
    items: [{
      title: `Alquiler ${payment.period}`,
      quantity: 1,
      unit_price: payment.amount,
      currency_id: payment.currency,
    }],
    back_urls: {
      success: `${appUrl}/tenant/payments?status=success`,
      failure: `${appUrl}/tenant/payments?status=failure`,
      pending: `${appUrl}/tenant/payments?status=pending`,
    },
    external_reference: payment.id,
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

  const mpData = await mpRes.json() as { init_point: string; sandbox_init_point?: string };
  const initPoint = getPaymentsMode() === 'sandbox' && mpData.sandbox_init_point ? mpData.sandbox_init_point : mpData.init_point;
  return { initPoint, mode: getPaymentsMode() };
}

export async function getPublicMockTenantPayment(paymentId: string) {
  if (getPaymentsMode() !== 'mock') {
    throw new AppError('El checkout demo no está habilitado', 404, 'MOCK_DISABLED');
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      contract: {
        include: {
          property: true,
          tenants: true,
        },
      },
    },
  });
  if (!payment) throw notFound('Pago no encontrado');

  return {
    id: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    period: payment.period,
    description: `Alquiler ${payment.period}`,
    status: payment.status,
    property: {
      name: payment.contract.property.name,
      address: payment.contract.property.address,
    },
    tenant: payment.contract.tenants.length ? { name: payment.contract.tenants.map((t) => t.name).join(', ') } : null,
  };
}

export async function confirmPublicMockTenantPayment(paymentId: string) {
  if (getPaymentsMode() !== 'mock') {
    throw new AppError('El checkout demo no está habilitado', 404, 'MOCK_DISABLED');
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      contract: {
        include: {
          property: true,
          tenants: true,
        },
      },
    },
  });
  if (!payment) throw notFound('Pago no encontrado');

  if (payment.status === 'PAID') {
    return { status: 'PAID', message: 'Este pago ya estaba confirmado' };
  }

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'PAID',
      paidDate: new Date(),
      method: 'Mercado Pago',
    },
  });

  await createNotification({
    userId: payment.contract.property.userId,
    type: 'PAYMENT',
    message: `Pago recibido por Mercado Pago: ${payment.contract.property.name ?? payment.contract.property.address} - ${currencySymbol(payment.currency)}${payment.amount.toLocaleString('es-AR')}`,
    referenceId: payment.id,
  });

  return { status: 'PAID', payment: updated };
}

export async function getUpcomingPayments(tenantId: string) {
  await ensurePaymentsForTenant(tenantId);

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { contract: true },
  });

  if (!tenant?.contract) throw notFound();

  const { contract } = tenant;
  const now = new Date();
  const upcoming = [];

  for (let i = 0; i < 3; i++) {
    const dueDate = new Date(now.getFullYear(), now.getMonth() + i, contract.paymentDay);
    // `month` es el label humano que ve el inquilino; `period` es la clave canónica
    // (YYYY-MM) con la que se guardan/consultan los pagos. Deben mantenerse separados.
    const month = dueDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    const period = periodKey(dueDate);

    const payment = await prisma.payment.findUnique({
      where: {
        contractId_period: { contractId: contract.id, period },
      },
    });

    if (payment) {
      upcoming.push({
        id: payment.id,
        month,
        dueDate: payment.dueDate,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        hasAdjustment: false,
        adjustmentPct: null,
      });
    }
  }

  return upcoming;
}

export async function getPaymentReceipt(tenantId: string, paymentId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw forbidden();

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { mpReceipt: true },
  });
  if (!payment || payment.contractId !== tenant.contractId) throw forbidden();

  if (payment.status !== 'PAID') {
    throw new AppError('El pago no está confirmado', 400, 'NOT_PAID');
  }

  let receipt = await prisma.cashReceipt.findUnique({ where: { paymentId } });
  if (!receipt) {
    receipt = await prisma.cashReceipt.create({ data: { paymentId } });
  }

  return {
    receiptNumber: receipt.receiptNumber,
    issuedAt: receipt.issuedAt,
    amount: payment.amount,
    currency: payment.currency,
    period: payment.period,
    paidDate: payment.paidDate,
    method: payment.method,
    mp: payment.mpReceipt ? {
      paymentId: payment.mpReceipt.mpPaymentId,
      status: payment.mpReceipt.mpStatus,
      statusDetail: payment.mpReceipt.mpStatusDetail,
      paymentMethodId: payment.mpReceipt.paymentMethodId,
      paymentTypeId: payment.mpReceipt.paymentTypeId,
      transactionAmount: payment.mpReceipt.transactionAmount,
      currencyId: payment.mpReceipt.currencyId,
      payerEmail: payment.mpReceipt.payerEmail,
      dateApproved: payment.mpReceipt.dateApproved,
    } : null,
  };
}

export async function getClaims(tenantId: string) {
  return prisma.claim.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: { history: { orderBy: { changedAt: 'desc' } } },
  });
}

export async function getClaim(tenantId: string, claimId: string) {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: { history: { orderBy: { changedAt: 'desc' } } },
  });
  if (!claim || claim.tenantId !== tenantId) throw forbidden();
  return claim;
}

export async function createClaim(
  tenantId: string,
  input: { title: string; description: string; priority?: string; photoUrl?: string }
) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { contract: { include: { property: { include: { user: true } } } } },
  });
  if (!tenant?.contract) throw notFound();

  const claim = await prisma.claim.create({
    data: {
      tenantId,
      title: input.title,
      category: 'OTHER',
      description: input.description,
      photoUrl: input.photoUrl,
      ...(input.priority ? { priority: input.priority.toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW' } : {}),
      status: 'OPEN',
    },
  });

  const ownerId = tenant.contract.property.user.id;
  await createNotification({
    userId: ownerId,
    type: 'CLAIM',
    message: `Nuevo reclamo de ${tenant.name}: ${input.title}`,
    referenceId: claim.id,
  });
  sendPushToUser(ownerId, 'Nueva solicitud de reparación', `${tenant.name}: ${input.title}`, {
    type: 'claim',
    claimId: claim.id,
  });

  return claim;
}

export async function updateClaimDescription(
  tenantId: string,
  claimId: string,
  input: { description?: string }
) {
  const description = input.description?.trim();
  if (!description) {
    throw new AppError('Description is required', 400, 'VALIDATION_ERROR');
  }

  const claim = await prisma.claim.findUnique({ where: { id: claimId } });
  if (!claim || claim.tenantId !== tenantId) throw forbidden();

  return prisma.claim.update({
    where: { id: claimId },
    data: { description },
    include: { history: { orderBy: { changedAt: 'desc' } } },
  });
}

export async function deleteClaim(tenantId: string, claimId: string) {
  const claim = await prisma.claim.findUnique({ where: { id: claimId } });
  if (!claim || claim.tenantId !== tenantId) throw forbidden();

  await prisma.$transaction([
    prisma.claimNote.deleteMany({ where: { claimId } }),
    prisma.claimHistory.deleteMany({ where: { claimId } }),
    prisma.claim.delete({ where: { id: claimId } }),
  ]);

  return { id: claimId };
}

export async function getPropertyPhotos(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      contract: {
        include: {
          property: {
            include: {
              photos: {
                where: { deletedAt: null },
                orderBy: { uploadedAt: 'asc' },
              },
            },
          },
        },
      },
    },
  });
  if (!tenant?.contract) throw notFound('Sin contrato asignado');
  return tenant.contract.property.photos;
}

export async function getNotifications(userId: string) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  const unreadCount = notifications.filter(n => !n.read).length;
  return { data: notifications, unreadCount };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const n = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!n || n.userId !== userId) throw forbidden();
  return prisma.notification.update({ where: { id: notificationId }, data: { read: true } });
}

export async function markNotificationUnread(userId: string, notificationId: string) {
  const n = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!n || n.userId !== userId) throw forbidden();
  return prisma.notification.update({ where: { id: notificationId }, data: { read: false } });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId }, data: { read: true } });
  return { success: true };
}
