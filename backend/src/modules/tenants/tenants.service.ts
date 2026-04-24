import prisma from '../../lib/prisma';
import { CreateTenantInput } from './tenants.schema';

export async function createTenant(contractId: string, input: CreateTenantInput) {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) {
    throw Object.assign(new Error('Contract not found'), { code: 'NOT_FOUND', status: 404 });
  }

  const existing = await prisma.tenant.findUnique({ where: { contractId } });
  if (existing) {
    throw Object.assign(new Error('Tenant already exists for this contract'), { code: 'TENANT_EXISTS', status: 409 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, role: true },
  });

  if (existingUser?.role === 'OWNER') {
    throw Object.assign(
      new Error('Email belongs to an owner account. Use a tenant account email.'),
      { code: 'EMAIL_ROLE_CONFLICT', status: 409 }
    );
  }

  if (existingUser?.role === 'TENANT') {
    const linkedTenant = await prisma.tenant.findFirst({ where: { userId: existingUser.id } });
    if (linkedTenant) {
      throw Object.assign(
        new Error('This tenant user is already linked to another contract'),
        { code: 'TENANT_USER_ALREADY_LINKED', status: 409 }
      );
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
    throw Object.assign(new Error('Tenant not found'), { code: 'NOT_FOUND', status: 404 });
  }
  return tenant;
}

export async function resendLink(contractId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { contractId } });
  if (!tenant) {
    throw Object.assign(new Error('Tenant not found'), { code: 'NOT_FOUND', status: 404 });
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const link = `${appUrl}/public/portal/${tenant.linkToken}`;
  return { link };
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
    throw Object.assign(new Error('Invalid link'), { code: 'NOT_FOUND', status: 404 });
  }

  if (tenant.contract.endDate < new Date()) {
    throw Object.assign(new Error('Contract has expired'), { code: 'LINK_EXPIRED', status: 410 });
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
    throw Object.assign(new Error('Invalid link'), { code: 'NOT_FOUND', status: 404 });
  }

  const payment = tenant.contract.payments.find(p => p.id === paymentId);
  if (!payment) {
    throw Object.assign(new Error('Payment not found'), { code: 'NOT_FOUND', status: 404 });
  }
  if (payment.status === 'PAID') {
    throw Object.assign(new Error('Payment already confirmed'), { code: 'CONFLICT', status: 409 });
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
    throw Object.assign(new Error('Invalid link'), { code: 'NOT_FOUND', status: 404 });
  }

  if (tenant.contract.endDate < new Date()) {
    throw Object.assign(new Error('Contract has expired'), { code: 'LINK_EXPIRED', status: 410 });
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
