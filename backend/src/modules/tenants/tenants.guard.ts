import { AppError } from '../../lib/AppError';
import prisma from '../../lib/prisma';

export async function assertContractOwner(contractId: string, userId: string) {
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

export async function assertTenantOwner(tenantId: string, userId: string) {
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
  return tenant;
}
