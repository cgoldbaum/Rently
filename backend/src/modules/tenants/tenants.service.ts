import { AppError } from '../../lib/AppError';
import prisma from '../../lib/prisma';
import { CreateTenantInput } from './tenants.schema';

/** Verifica que el contrato exista y pertenezca al propietario logueado. */
async function assertContractOwner(contractId: string, userId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { property: { select: { userId: true } } },
  });
  if (!contract) {
    throw new AppError('Contract not found', 404, 'NOT_FOUND');
  }
  if (contract.property.userId !== userId) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }
  return contract;
}

export async function createTenant(contractId: string, userId: string, input: CreateTenantInput) {
  await assertContractOwner(contractId, userId);

  // No permitir el mismo email dos veces en el mismo contrato
  const existing = await prisma.tenant.findFirst({ where: { contractId, email: input.email } });
  if (existing) {
    throw new AppError('Este inquilino ya está asignado al contrato', 409, 'TENANT_EXISTS');
  }

  // Si el email corresponde a una cuenta existente, vinculamos el perfil de inquilino a ese
  // usuario — sin importar su rol. Así un propietario puede ser también inquilino y un
  // inquilino puede tener varios alquileres.
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existingUser) {
    const alreadyLinked = await prisma.tenant.findFirst({ where: { contractId, userId: existingUser.id } });
    if (alreadyLinked) {
      throw new AppError('Este usuario ya es inquilino del contrato', 409, 'TENANT_EXISTS');
    }
  }

  const tenant = await prisma.tenant.create({
    data: {
      ...input,
      contractId,
      userId: existingUser?.id,
    },
  });

  return tenant;
}

export async function listTenants(contractId: string, userId: string) {
  await assertContractOwner(contractId, userId);
  return prisma.tenant.findMany({ where: { contractId }, orderBy: { createdAt: 'asc' } });
}

export async function resendLink(tenantId: string, userId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { contract: { include: { property: { select: { userId: true } } } } },
  });
  if (!tenant) {
    throw new AppError('Tenant not found', 404, 'NOT_FOUND');
  }
  if (tenant.contract.property.userId !== userId) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const link = `${appUrl}/public/portal/${tenant.linkToken}`;
  return { link };
}

export async function deleteTenant(tenantId: string, userId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { contract: { include: { property: { select: { userId: true } } } } },
  });
  if (!tenant) {
    throw new AppError('Tenant not found', 404, 'NOT_FOUND');
  }
  if (tenant.contract.property.userId !== userId) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  await prisma.$transaction(async (tx) => {
    await tx.claimHistory.deleteMany({ where: { claim: { tenantId } } });
    await tx.claimNote.deleteMany({ where: { claim: { tenantId } } });
    await tx.claim.deleteMany({ where: { tenantId } });
    await tx.tenant.delete({ where: { id: tenantId } });
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
