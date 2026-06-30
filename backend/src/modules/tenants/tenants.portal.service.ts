import { AppError } from '../../lib/AppError';
import prisma from '../../lib/prisma';

export async function getPublicLinkInfo(token: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { linkToken: token },
    include: {
      contract: {
        include: { property: true },
      },
    },
  });

  if (!tenant) {
    throw new AppError('Invalid link', 404, 'NOT_FOUND');
  }

  if (tenant.contract.endDate < new Date()) {
    throw new AppError('Contract has expired', 410, 'LINK_EXPIRED');
  }

  return {
    tenantName: tenant.name,
    propertyAddress: tenant.contract.property.address,
    contractEndDate: tenant.contract.endDate,
    linkToken: tenant.linkToken,
  };
}

export async function confirmCashPayment(token: string, paymentId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { linkToken: token },
    include: { contract: { include: { payments: true } } },
  });

  if (!tenant) {
    throw new AppError('Invalid link', 404, 'NOT_FOUND');
  }

  const payment = tenant.contract.payments.find(p => p.id === paymentId);
  if (!payment) {
    throw new AppError('Payment not found', 404, 'NOT_FOUND');
  }
  if (payment.status === 'PAID') {
    throw new AppError('Payment already confirmed', 409, 'CONFLICT');
  }

  return prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'PAID', method: 'Efectivo', paidDate: new Date() },
  });
}

export async function getTenantPortalData(token: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { linkToken: token },
    include: {
      contract: {
        include: {
          property: true,
          payments: { orderBy: { dueDate: 'desc' } },
          adjustmentHistory: { orderBy: { appliedAt: 'desc' }, take: 5 },
        },
      },
      claims: {
        orderBy: { createdAt: 'desc' },
        include: { history: true },
      },
    },
  });

  if (!tenant) {
    throw new AppError('Invalid link', 404, 'NOT_FOUND');
  }

  if (tenant.contract.endDate < new Date()) {
    throw new AppError('Contract has expired', 410, 'LINK_EXPIRED');
  }

  const contract = tenant.contract;
  const now = new Date();
  const nextPaymentDate = new Date(now.getFullYear(), now.getMonth(), contract.paymentDay);
  if (nextPaymentDate <= now) {
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
  }

  return {
    tenant: {
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      linkToken: tenant.linkToken,
    },
    property: {
      address: contract.property.address,
      type: contract.property.type,
    },
    contract: {
      startDate: contract.startDate,
      endDate: contract.endDate,
      currentAmount: contract.currentAmount,
      initialAmount: contract.initialAmount,
      paymentDay: contract.paymentDay,
      indexType: contract.indexType,
      adjustFrequency: contract.adjustFrequency,
      nextAdjustDate: contract.nextAdjustDate,
    },
    nextPayment: {
      amount: contract.currentAmount,
      dueDate: nextPaymentDate,
    },
    payments: contract.payments,
    adjustmentHistory: contract.adjustmentHistory,
    claims: tenant.claims,
  };
}
