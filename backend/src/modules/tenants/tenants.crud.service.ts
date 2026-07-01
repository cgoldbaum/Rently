import { AppError } from '../../lib/AppError';
import prisma from '../../lib/prisma';
import { CreateTenantInput } from './tenants.schema';
import { assertContractOwner, assertTenantOwner } from './tenants.guard';

export async function createTenant(contractId: string, userId: string, input: CreateTenantInput) {
  await assertContractOwner(contractId, userId);

  const existing = await prisma.tenant.findFirst({ where: { contractId, email: input.email } });
  if (existing) {
    throw new AppError('errors:tenant.alreadyAssigned', 409, 'TENANT_EXISTS');
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existingUser) {
    const alreadyLinked = await prisma.tenant.findFirst({ where: { contractId, userId: existingUser.id } });
    if (alreadyLinked) {
      throw new AppError('errors:tenant.userAlreadyAssigned', 409, 'TENANT_EXISTS');
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

export async function deleteTenant(tenantId: string, userId: string) {
  await assertTenantOwner(tenantId, userId);

  await prisma.$transaction(async (tx) => {
    await tx.claimHistory.deleteMany({ where: { claim: { tenantId } } });
    await tx.claimNote.deleteMany({ where: { claim: { tenantId } } });
    await tx.claim.deleteMany({ where: { tenantId } });
    await tx.tenant.delete({ where: { id: tenantId } });
  });

  return { deleted: true };
}
