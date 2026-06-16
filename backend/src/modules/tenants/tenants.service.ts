import { AppError } from '../../lib/AppError';
import prisma from '../../lib/prisma';
import { CreateTenantInput } from './tenants.schema';

export async function createTenant(contractId: string, input: CreateTenantInput) {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) {
    throw new AppError('Contract not found', 404, 'NOT_FOUND');
  }

  const existing = await prisma.tenant.findUnique({ where: { contractId } });
  if (existing) {
    throw new AppError('Tenant already exists for this contract', 409, 'TENANT_EXISTS');
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, role: true },
  });

  if (existingUser?.role === 'OWNER') {
    throw new AppError('Email belongs to an owner account. Use a tenant account email.', 409, 'EMAIL_ROLE_CONFLICT');
  }

  if (existingUser?.role === 'TENANT') {
    const linkedTenant = await prisma.tenant.findFirst({ where: { userId: existingUser.id } });
    if (linkedTenant) {
      throw new AppError('This tenant user is already linked to another contract', 409, 'TENANT_USER_ALREADY_LINKED');
    }
  }

  const tenant = await prisma.tenant.create({
    data: {
      ...input,
      contractId,
      userId: existingUser?.role === 'TENANT' ? existingUser.id : undefined,
    },
  });

  return tenant;
}

export async function getTenant(contractId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { contractId } });
  if (!tenant) {
    throw new AppError('Tenant not found', 404, 'NOT_FOUND');
  }
  return tenant;
}

export async function resendLink(contractId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { contractId } });
  if (!tenant) {
    throw new AppError('Tenant not found', 404, 'NOT_FOUND');
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const link = `${appUrl}/public/portal/${tenant.linkToken}`;
  return { link };
}

export async function deleteTenant(contractId: string, userId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { property: true, tenant: true },
  });
  if (!contract) {
    throw new AppError('Contract not found', 404, 'NOT_FOUND');
  }
  if (contract.property.userId !== userId) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }
  if (!contract.tenant) {
    throw new AppError('Tenant not found', 404, 'NOT_FOUND');
  }

  await prisma.$transaction(async (tx) => {
    await tx.claimHistory.deleteMany({ where: { claim: { tenantId: contract.tenant!.id } } });
    await tx.claimNote.deleteMany({ where: { claim: { tenantId: contract.tenant!.id } } });
    await tx.claim.deleteMany({ where: { tenantId: contract.tenant!.id } });
    await tx.tenant.delete({ where: { id: contract.tenant!.id } });
  });

  return { deleted: true };
}

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
