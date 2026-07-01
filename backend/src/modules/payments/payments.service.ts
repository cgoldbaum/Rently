import { AppError } from '../../lib/AppError';
import prisma from '../../lib/prisma';
import { CreatePaymentInput, UpdatePaymentInput } from './payments.schema';
import { ensurePaymentsForOwner } from './paymentSchedule';
import { sendPushToUser } from '../../lib/pushNotifications';
import { sendEmail } from '../../lib/email';
import { getT, languageOf, DEFAULT_LANGUAGE } from '../../i18n';

export async function createPayment(contractId: string, input: CreatePaymentInput) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: { currency: true },
  });
  if (!contract) {
    throw new AppError('errors:contract.notFound', 404, 'NOT_FOUND');
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
          tenants: true,
        },
      },
    },
    orderBy: { dueDate: 'desc' },
  });
}

export async function updatePayment(paymentId: string, userId: string, input: UpdatePaymentInput, language?: string) {
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

  if (!payment) {
    throw new AppError('errors:payment.notFound', 404, 'NOT_FOUND');
  }

  if (payment.contract.property.userId !== userId) {
    throw new AppError('errors:payment.accessDenied', 403, 'FORBIDDEN');
  }

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: input.status,
      paidDate: input.paidDate ? new Date(input.paidDate) : (input.status === 'PAID' ? new Date() : undefined),
      method: input.method,
    },
  });

  const propertyLabel = payment.contract.property.name ?? payment.contract.property.address;
  const fmtAmount = `${payment.currency === 'ARS' ? '$' : 'USD'} ${Math.round(payment.amount).toLocaleString()}`;
  const tenantT = getT(DEFAULT_LANGUAGE);

  for (const tenant of payment.contract.tenants) {
    // Notificar al inquilino cuando el propietario confirma o rechaza un pago
    if (payment.status === 'PENDING_CONFIRMATION') {
      const isPaid = input.status === 'PAID';
      const message = isPaid
        ? tenantT('notify:paymentConfirmation.confirmedTenant')
        : tenantT('notify:paymentConfirmation.needsReviewTenant');

      if (tenant.userId) {
        await prisma.notification.create({
          data: { userId: tenant.userId, type: 'PAYMENT', message, referenceId: payment.id },
        });
        sendPushToUser(tenant.userId, isPaid ? tenantT('notify:paymentConfirmation.confirmedPushTitle') : tenantT('notify:paymentConfirmation.needsReviewPushTitle'), message, { type: 'payment', paymentId: payment.id });
      }

      // Email al inquilino
      await sendEmail(
        tenant.email,
        isPaid ? tenantT('notify:paymentConfirmation.confirmedEmailSubject') : tenantT('notify:paymentConfirmation.needsReviewEmailSubject'),
        isPaid
          ? `<p>Hola ${tenant.name},</p>
             <p>${tenantT('notify:paymentConfirmation.confirmedEmailBody', { amount: fmtAmount, period: payment.period, property: propertyLabel })}</p>
             <p>— Rently</p>`
          : `<p>Hola ${tenant.name},</p>
             <p>${tenantT('notify:paymentConfirmation.needsReviewEmailBody', { period: payment.period, property: propertyLabel })}</p>
             <p>— Rently</p>`
      );
    }

    // Notificar al inquilino cuando el propietario marca un pago como PAID directamente
    if (input.status === 'PAID' && payment.status !== 'PENDING_CONFIRMATION') {
      await sendEmail(
        tenant.email,
        tenantT('notify:paymentConfirmation.registeredByOwnerSubject'),
        `<p>Hola ${tenant.name},</p>
         <p>${tenantT('notify:paymentConfirmation.registeredByOwnerBody', { amount: fmtAmount, period: payment.period, property: propertyLabel })}</p>
         <p>— Rently</p>`
      );
    }
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
    throw new AppError('errors:payment.notFound', 404, 'NOT_FOUND');
  }

  if (payment.contract.property.userId !== userId) {
    throw new AppError('errors:payment.accessDenied', 403, 'FORBIDDEN');
  }

  if (payment.status !== 'PAID') {
    throw new AppError('errors:payment.notPaid', 400, 'NOT_PAID');
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
