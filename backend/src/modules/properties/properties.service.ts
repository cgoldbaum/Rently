import prisma from '../../lib/prisma';
import { CreatePropertyInput, UpdatePropertyInput } from './properties.schema';
import { PropertyStatus } from '@prisma/client';

function computeStatus(contract: { startDate: Date; endDate: Date } | null): PropertyStatus {
  if (!contract) return 'VACANT';
  const now = new Date();
  if (contract.endDate < now) return 'VACANT';
  const daysUntilEnd = (contract.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntilEnd <= 30) return 'EXPIRING_SOON';
  return 'OCCUPIED';
}

export async function createProperty(userId: string, input: CreatePropertyInput) {
  const property = await prisma.property.create({
    data: { ...input, userId, status: 'VACANT' },
  });
  return property;
}

export async function listProperties(userId: string) {
  const properties = await prisma.property.findMany({
    where: { userId },
    include: {
      contract: {
        include: { tenant: { include: { claims: { where: { status: 'OPEN' } } } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return properties.map((p) => {
    const status = computeStatus(p.contract);
    const openClaims = p.contract?.tenant?.claims?.length ?? 0;
    return { ...p, status, openClaims };
  });
}

export async function getProperty(propertyId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      contract: { include: { tenant: true } },
    },
  });
  if (!property) {
    throw Object.assign(new Error('Property not found'), { code: 'NOT_FOUND', status: 404 });
  }
  const status = computeStatus(property.contract);
  return { ...property, status };
}

export async function updateProperty(propertyId: string, input: UpdatePropertyInput) {
  const property = await prisma.property.update({
    where: { id: propertyId },
    data: input,
  });
  return property;
}
