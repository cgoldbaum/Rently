import prisma from '../../lib/prisma';
import { CreatePaymentInput, UpdatePaymentInput } from './payments.schema';
import { ensurePaymentsForOwner } from './paymentSchedule';
import { sendPushToUser } from '../../lib/pushNotifications';
import { sendEmail } from '../../lib/email';

export async function createPayment(contractId: string, input: CreatePaymentInput) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: { currency: true },
  });
  if (!contract) {
    throw Object.assign(new Error('Contract not found'), { code: 'NOT_FOUND', status: 404 });
  }

  return prisma.payment.create({
    data: {
      contractId,
      amount: input.amount,
      currency: input.currency ?? contract.currency,
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

  const tenant = payment.contract.tenant;
  const propertyLabel = payment.contract.property.name ?? payment.contract.property.address;
  const fmtAmount = `${payment.currency === 'ARS' ? '$' : 'USD'} ${Math.round(payment.amount).toLocaleString('es-AR')}`;

  // Notificar al inquilino cuando el propietario confirma o rechaza un pago
  if (tenant && payment.status === 'PENDING_CONFIRMATION') {
    const isPaid = input.status === 'PAID';
    const message = isPaid
      ? 'Tu pago en efectivo fue confirmado por el propietario'
      : 'Tu pago en efectivo requiere revisión. Contactá a tu propietario.';

    if (tenant.userId) {
      await prisma.notification.create({
        data: { userId: tenant.userId, type: 'PAYMENT', message, referenceId: payment.id },
      });
      sendPushToUser(tenant.userId, isPaid ? 'Pago confirmado' : 'Revisión de pago', message, { type: 'payment', paymentId: payment.id });
    }

    // Email al inquilino
    await sendEmail(
      tenant.email,
      isPaid ? 'Rently – Pago confirmado' : 'Rently – Revisión de pago requerida',
      isPaid
        ? `<p>Hola ${tenant.name},</p>
           <p>Tu pago de <strong>${fmtAmount}</strong> por el período <strong>${payment.period}</strong> en <strong>${propertyLabel}</strong> fue <strong>confirmado</strong> por tu propietario.</p>
           <p>— Rently</p>`
        : `<p>Hola ${tenant.name},</p>
           <p>Tu pago por el período <strong>${payment.period}</strong> en <strong>${propertyLabel}</strong> requiere revisión. Por favor contactá a tu propietario.</p>
           <p>— Rently</p>`
    );
  }

  // Notificar al inquilino cuando el propietario marca un pago como PAID directamente
  if (tenant && input.status === 'PAID' && payment.status !== 'PENDING_CONFIRMATION') {
    await sendEmail(
      tenant.email,
      'Rently – Pago registrado',
      `<p>Hola ${tenant.name},</p>
       <p>El propietario registró tu pago de <strong>${fmtAmount}</strong> por el período <strong>${payment.period}</strong> en <strong>${propertyLabel}</strong> como <strong>pagado</strong>.</p>
       <p>— Rently</p>`
    );
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

export async function getPaymentReceipt(paymentId: string, userId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      contract: { include: { property: true } },
      mpReceipt: true,
    },
  });

  if (!payment) {
    throw Object.assign(new Error('Payment not found'), { code: 'NOT_FOUND', status: 404 });
  }

  if (payment.contract.property.userId !== userId) {
    throw Object.assign(new Error('Access denied'), { code: 'FORBIDDEN', status: 403 });
  }

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
    currency: payment.currency,
    period: payment.period,
    paidDate: payment.paidDate,
    method: payment.method,
    property: payment.contract.property.name ?? payment.contract.property.address,
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
