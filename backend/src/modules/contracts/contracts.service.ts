import { AppError } from '../../lib/AppError';
import prisma from '../../lib/prisma';
import { CreateContractInput, UpdateContractInput } from './contracts.schema';
import { addMonths } from '../../lib/helpers';

export async function createContract(propertyId: string, input: CreateContractInput) {
  const existing = await prisma.contract.findUnique({ where: { propertyId } });
  if (existing) {
    throw new AppError('Property already has a contract', 409, 'CONTRACT_EXISTS');
  }

  const startDate = new Date(input.startDate);
  const isManual = input.indexType === 'MANUAL';
  const adjustFreq = isManual ? 0 : (input.adjustFrequency ?? 3);
  const nextAdjustDate = isManual ? null : addMonths(startDate, adjustFreq);

  const contract = await prisma.contract.create({
    data: {
      propertyId,
      startDate,
      endDate: new Date(input.endDate),
      initialAmount: input.initialAmount,
      currentAmount: input.initialAmount,
      paymentDay: input.paymentDay,
      indexType: input.indexType,
      adjustFrequency: adjustFreq,
      nextAdjustDate,
    },
  });

  return contract;
}

export async function getContract(propertyId: string) {
  const contract = await prisma.contract.findUnique({
    where: { propertyId },
    include: { tenant: true },
  });
  if (!contract) {
    throw new AppError('Contract not found', 404, 'NOT_FOUND');
  }
  return contract;
}

export async function updateContract(propertyId: string, input: UpdateContractInput) {
  const contract = await prisma.contract.findUnique({ where: { propertyId } });
  if (!contract) {
    throw new AppError('Contract not found', 404, 'NOT_FOUND');
  }

  const updateData: Record<string, unknown> = { ...input };
  if (input.startDate) updateData.startDate = new Date(input.startDate);
  if (input.endDate) updateData.endDate = new Date(input.endDate);

  const effectiveIndexType = input.indexType ?? contract.indexType;
  if (effectiveIndexType === 'MANUAL') {
    updateData.nextAdjustDate = null;
    updateData.adjustFrequency = 0;
  } else if (input.startDate || input.adjustFrequency) {
    const startDate = input.startDate ? new Date(input.startDate) : contract.startDate;
    const freq = input.adjustFrequency ?? contract.adjustFrequency;
    updateData.nextAdjustDate = addMonths(startDate, freq);
  }

  const updated = await prisma.contract.update({ where: { propertyId }, data: updateData });

  return updated;
}
