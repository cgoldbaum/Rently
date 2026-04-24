import prisma from '../../lib/prisma';

function notFound(msg = 'Not found') {
  return Object.assign(new Error(msg), { code: 'NOT_FOUND', status: 404 });
}
function forbidden(msg = 'Access denied') {
  return Object.assign(new Error(msg), { code: 'FORBIDDEN', status: 403 });
}

export async function getContract(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      contract: {
        include: {
          property: true,
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
    progress,
  };
}

export async function getPayments(
  tenantId: string,
  params: { status?: string; page?: number; limit?: number }
) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw notFound();

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
  input: { amount: number; date?: string; note?: string }
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
      method: 'Efectivo',
      cashNote: input.note,
    },
  });

  // Notify the property owner
  await prisma.notification.create({
    data: {
      userId: tenant.contract.property.user.id,
      type: 'PAYMENT',
      message: `${tenant.name} registró un pago en efectivo de $${input.amount.toLocaleString('es-AR')}`,
      referenceId: payment.id,
    },
  });

  return payment;
}

export async function getUpcomingPayments(tenantId: string) {
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
    upcoming.push({
      month,
      dueDate,
      amount: contract.currentAmount,
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
  input: { title: string; description: string; priority: string }
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
      priority: input.priority.toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW',
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
