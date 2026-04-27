import prisma from '../../lib/prisma';
import { ensurePaymentsForTenant } from '../payments/paymentSchedule';

function notFound(msg = 'Not found') {
  return Object.assign(new Error(msg), { code: 'NOT_FOUND', status: 404 });
}
function forbidden(msg = 'Access denied') {
  return Object.assign(new Error(msg), { code: 'FORBIDDEN', status: 403 });
}

function getAppUrl() {
  return process.env.APP_URL || 'http://localhost:3000';
}

function getApiUrl() {
  const localApiUrl = `http://localhost:${process.env.PORT || 4000}`;
  if (process.env.API_URL === 'http://localhost:4000' && process.env.PORT && process.env.PORT !== '4000') {
    return localApiUrl;
  }

  return process.env.API_URL || localApiUrl;
}

function isLocalUrl(url: string) {
  return url.includes('localhost') || url.includes('127.0.0.1');
}

function getPaymentsMode() {
  return (process.env.PAYMENTS_MODE || 'mock').toLowerCase();
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
      throw Object.assign(new Error('Este pago ya está confirmado'), { code: 'ALREADY_PAID', status: 409 });
    }

    const payment = await prisma.payment.update({
      where: { id: existing.id },
      data: {
        status: 'PENDING_CONFIRMATION',
        method: input.method || 'Efectivo',
        cashNote: input.note,
      },
    });

    await prisma.notification.create({
      data: {
        userId: tenant.contract.property.user.id,
        type: 'PAYMENT',
        message: `${tenant.name} informó un pago por ${payment.method ?? 'Efectivo'} de $${payment.amount.toLocaleString('es-AR')} para ${payment.period}`,
        referenceId: payment.id,
      },
    });

    return payment;
  }

  if (tenant.contract.payments.length > 0) {
    throw Object.assign(
      new Error('Ya existe un pago pendiente de confirmación para este período'),
      { code: 'PENDING_EXISTS', status: 409 }
    );
  }

  const now = new Date();
  const period = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const dueDate = new Date(now.getFullYear(), now.getMonth(), tenant.contract.paymentDay);

  const payment = await prisma.payment.create({
    data: {
      contractId: tenant.contractId,
      amount: input.amount,
      period,
      dueDate,
      status: 'PENDING_CONFIRMATION',
      method: input.method || 'Efectivo',
      cashNote: input.note,
    },
  });

  // Notify the property owner
  await prisma.notification.create({
    data: {
      userId: tenant.contract.property.user.id,
      type: 'PAYMENT',
      message: `${tenant.name} registró un pago por ${payment.method ?? 'Efectivo'} de $${input.amount.toLocaleString('es-AR')}`,
      referenceId: payment.id,
    },
  });

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
    include: { contract: { include: { property: true, tenant: true } } },
  });
  if (!payment || payment.contractId !== tenant.contractId) throw forbidden();
  if (payment.status === 'PAID') {
    throw Object.assign(new Error('Este pago ya está confirmado'), { code: 'ALREADY_PAID', status: 409 });
  }

  if (getPaymentsMode() === 'mock') {
    return {
      initPoint: `${getAppUrl()}/public/mercadopago-demo?paymentId=${payment.id}`,
      mode: 'mock',
    };
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw Object.assign(
      new Error('Mercado Pago no está configurado. Agregá MERCADOPAGO_ACCESS_TOKEN al .env o usá PAYMENTS_MODE=mock'),
      { code: 'MP_NOT_CONFIGURED', status: 503 }
    );
  }

  const appUrl = getAppUrl();
  const body: Record<string, unknown> = {
    items: [{
      title: `Alquiler ${payment.period}`,
      quantity: 1,
      unit_price: payment.amount,
      currency_id: 'ARS',
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
    throw Object.assign(new Error(`Error de Mercado Pago: ${err}`), { code: 'MP_ERROR', status: 502 });
  }

  const mpData = await mpRes.json() as { init_point: string; sandbox_init_point?: string };
  const initPoint = getPaymentsMode() === 'sandbox' && mpData.sandbox_init_point ? mpData.sandbox_init_point : mpData.init_point;
  return { initPoint, mode: getPaymentsMode() };
}

export async function getPublicMockTenantPayment(paymentId: string) {
  if (getPaymentsMode() !== 'mock') {
    throw Object.assign(new Error('El checkout demo no está habilitado'), { code: 'MOCK_DISABLED', status: 404 });
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      contract: {
        include: {
          property: true,
          tenant: true,
        },
      },
    },
  });
  if (!payment) throw notFound('Pago no encontrado');

  return {
    id: payment.id,
    amount: payment.amount,
    period: payment.period,
    description: `Alquiler ${payment.period}`,
    status: payment.status,
    property: {
      name: payment.contract.property.name,
      address: payment.contract.property.address,
    },
    tenant: payment.contract.tenant ? { name: payment.contract.tenant.name } : null,
  };
}

export async function confirmPublicMockTenantPayment(paymentId: string) {
  if (getPaymentsMode() !== 'mock') {
    throw Object.assign(new Error('El checkout demo no está habilitado'), { code: 'MOCK_DISABLED', status: 404 });
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      contract: {
        include: {
          property: true,
          tenant: true,
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

  await prisma.notification.create({
    data: {
      userId: payment.contract.property.userId,
      type: 'PAYMENT',
      message: `Pago recibido por Mercado Pago: ${payment.contract.property.name ?? payment.contract.property.address} - $${payment.amount.toLocaleString('es-AR')}`,
      referenceId: payment.id,
    },
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
    const month = dueDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    const monthStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
    const nextMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 1);
    let payment = await prisma.payment.findFirst({
      where: {
        contractId: contract.id,
        dueDate: {
          gte: monthStart,
          lt: nextMonth,
        },
      },
    });

    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          contractId: contract.id,
          amount: contract.currentAmount,
          period: month,
          dueDate,
          status: dueDate.getTime() < now.getTime() ? 'LATE' : 'PENDING',
        },
      });
    }

    upcoming.push({
      id: payment.id,
      month,
      dueDate: payment.dueDate,
      amount: payment.amount,
      status: payment.status,
      method: payment.method,
      hasAdjustment: false,
      adjustmentPct: null,
    });
  }

  return upcoming;
}

export async function getPaymentReceipt(tenantId: string, paymentId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw forbidden();

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.contractId !== tenant.contractId) throw forbidden();

  if (payment.status !== 'PAID') {
    throw Object.assign(new Error('El pago no está confirmado'), { code: 'NOT_PAID', status: 400 });
  }

  let receipt = await prisma.cashReceipt.findUnique({ where: { paymentId } });
  if (!receipt) {
    receipt = await prisma.cashReceipt.create({ data: { paymentId } });
  }

  return {
    receiptNumber: receipt.receiptNumber,
    issuedAt: receipt.issuedAt,
    amount: payment.amount,
    period: payment.period,
    paidDate: payment.paidDate,
    method: payment.method,
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
  input: { title: string; description: string; priority?: string }
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
      ...(input.priority ? { priority: input.priority.toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW' } : {}),
      status: 'OPEN',
    },
  });

  // Notify the property owner
  await prisma.notification.create({
    data: {
      userId: tenant.contract.property.user.id,
      type: 'CLAIM',
      message: `Nuevo reclamo de ${tenant.name}: ${input.title}`,
      referenceId: claim.id,
    },
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
    throw Object.assign(new Error('Description is required'), { code: 'VALIDATION_ERROR', status: 400 });
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
    include: { contract: { include: { property: { include: { photos: { orderBy: { uploadedAt: 'asc' } } } } } } },
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

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId }, data: { read: true } });
  return { success: true };
}
