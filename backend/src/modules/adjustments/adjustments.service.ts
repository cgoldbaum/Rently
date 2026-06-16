import { AppError } from '../../lib/AppError';
import prisma from '../../lib/prisma';
import { CreateAdjustmentInput } from './adjustments.schema';

export async function listAdjustmentsByOwner(userId: string) {
  return prisma.adjustmentHistory.findMany({
    where: {
      contract: { property: { userId } },
    },
    include: {
      contract: { include: { property: true } },
    },
    orderBy: { appliedAt: 'desc' },
  });
}

export async function listAdjustmentsByContract(contractId: string) {
  return prisma.adjustmentHistory.findMany({
    where: { contractId },
    orderBy: { appliedAt: 'desc' },
  });
}

export async function createAdjustment(contractId: string, userId: string, input: CreateAdjustmentInput) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { property: true },
  });

  if (!contract) {
    throw new AppError('Contract not found', 404, 'NOT_FOUND');
  }

  if (contract.property.userId !== userId) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  const [adjustment] = await prisma.$transaction([
    prisma.adjustmentHistory.create({
      data: {
        contractId,
        indexType: input.indexType,
        previousAmount: input.previousAmount,
        newAmount: input.newAmount,
        variation: input.variation,
        notified: input.notified ?? false,
      },
    }),
    prisma.contract.update({
      where: { id: contractId },
      data: { currentAmount: input.newAmount },
    }),
  ]);

  return adjustment;
}
