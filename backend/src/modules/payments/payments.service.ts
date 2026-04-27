import prisma from '../../lib/prisma';
import { CreatePaymentInput, UpdatePaymentInput } from './payments.schema';
import { ensurePaymentsForOwner } from './paymentSchedule';

export async function createPayment(contractId: string, input: CreatePaymentInput) {
  return prisma.payment.create({
    data: {
      contractId,
      amount: input.amount,
      period: input.period,
      dueDate: new Date(input.dueDate),
      paidDate: input.paidDate ? new Date(input.paidDate) : undefined,
      status: input.status ?? 'PENDING',
      method: input.method,
    },
  });
}

export async function listPaymentsByContract(contractId: string) {
  return prisma.payment.findMany({
    where: { contractId },
    orderBy: { dueDate: 'desc' },
  });
}

export async function listPaymentsByOwner(userId: string) {
  await ensurePaymentsForOwner(userId);

  return prisma.payment.findMany({
    where: {
      contract: {
        property: { userId },
      },
    },
    include: {
      contract: {
        include: {
          property: true,
          tenant: true,
        },
      },
    },
    orderBy: { dueDate: 'desc' },
  });
}

export async function updatePayment(paymentId: string, userId: string, input: UpdatePaymentInput) {
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

  if (!payment) {
    throw Object.assign(new Error('Payment not found'), { code: 'NOT_FOUND', status: 404 });
  }

  if (payment.contract.property.userId !== userId) {
    throw Object.assign(new Error('Access denied'), { code: 'FORBIDDEN', status: 403 });
  }

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: input.status,
      paidDate: input.paidDate ? new Date(input.paidDate) : (input.status === 'PAID' ? new Date() : undefined),
      method: input.method,
    },
  });

  // Notify tenant when owner confirms or rejects a pending cash payment
  const tenant = payment.contract.tenant;
  if (tenant?.userId && payment.status === 'PENDING_CONFIRMATION') {
    const message =
      input.status === 'PAID'
        ? 'Tu pago en efectivo fue confirmado por el propietario'
        : 'Tu pago en efectivo requiere revisión. Contactá a tu propietario.';
    await prisma.notification.create({
      data: {
        userId: tenant.userId,
        type: 'PAYMENT',
        message,
        referenceId: payment.id,
      },
    });
  }

  return updated;
}

export async function getPaymentStats(userId: string) {
  await ensurePaymentsForOwner(userId);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const payments = await prisma.payment.findMany({
    where: { contract: { property: { userId } } },
    include: { contract: { include: { property: true } } },
  });

  const thisMonthPaid = payments
    .filter(p => p.status === 'PAID' && p.paidDate && p.paidDate >= startOfMonth && p.paidDate <= endOfMonth)
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = payments
    .filter(p => p.status === 'LATE' || p.status === 'PENDING')
    .reduce((sum, p) => sum + p.amount, 0);

  const lateCount = payments.filter(p => p.status === 'LATE').length;

  return { thisMonthPaid, pendingAmount, lateCount };
}
