import { AppError } from '../../lib/AppError';
import prisma from '../../lib/prisma';
import { CreatePropertyInput, UpdatePropertyInput } from './properties.schema';
import { PropertyStatus } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { assertCanCreateProperty } from '../subscriptions/subscriptions.service';
export { exportDescriptionPdf } from '../../lib/pdf';

export function computeStatus(contract: { startDate: Date; endDate: Date; tenants?: unknown[] | null } | null): PropertyStatus {
  if (!contract || !contract.tenants?.length) return 'VACANT';
  const now = new Date();
  if (contract.endDate < now) return 'VACANT';
  const daysUntilEnd = (contract.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntilEnd <= 30) return 'EXPIRING_SOON';
  return 'OCCUPIED';
}

async function removeUploadedFile(fileUrl?: string | null) {
  if (!fileUrl?.startsWith('/uploads/')) return;
  const uploadPath = path.resolve(process.cwd(), fileUrl.replace(/^\/+/, ''));
  const uploadRoot = path.resolve(process.cwd(), 'uploads');
  if (!uploadPath.startsWith(uploadRoot)) return;
  await fs.unlink(uploadPath).catch(() => {});
}


/**
 * Valida que `parentPropertyId` sea una propiedad del mismo owner, que no sea a su vez
 * una unidad (no se admite anidar más de un nivel) y, en edición, que la propiedad que
 * se está por convertir en unidad no tenga ya sus propias unidades vinculadas.
 */
async function assertValidParent(userId: string, propertyId: string | null, parentPropertyId: string) {
  if (propertyId && parentPropertyId === propertyId) {
    throw new AppError('errors:property.parentInvalid', 400, 'PARENT_INVALID');
  }
  const parent = await prisma.property.findUnique({
    where: { id: parentPropertyId },
    select: { userId: true, parentPropertyId: true },
  });
  if (!parent || parent.userId !== userId || parent.parentPropertyId) {
    throw new AppError('errors:property.parentInvalid', 400, 'PARENT_INVALID');
  }
  if (propertyId) {
    const unitsCount = await prisma.property.count({ where: { parentPropertyId: propertyId } });
    if (unitsCount > 0) {
      throw new AppError('errors:property.parentInvalid', 400, 'PARENT_INVALID');
    }
  }
}

export async function createProperty(userId: string, input: CreatePropertyInput) {
  await assertCanCreateProperty(userId);

  if (input.parentPropertyId) {
    await assertValidParent(userId, null, input.parentPropertyId);
  }

  const property = await prisma.property.create({
    data: { ...input, userId, status: 'VACANT' },
  });
  return property;
}

export async function listProperties(userId: string, statusFilter?: string) {
  const properties = await prisma.property.findMany({
    where: { userId },
    include: {
      contract: {
        include: {
          tenants: { include: { claims: { where: { status: 'OPEN' } } } },
          payments: { where: { status: 'LATE' }, take: 1 },
        },
      },
      parentProperty: { select: { id: true, name: true, address: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  let result = properties.map((p) => {
    let status = computeStatus(p.contract);
    if (status === 'OCCUPIED' && p.contract?.payments && p.contract.payments.length > 0) {
      status = 'IN_ARREARS';
    }
    const openClaims = p.contract?.tenants.flatMap((t) => t.claims).length ?? 0;
    return { ...p, status, openClaims };
  });

  if (statusFilter && statusFilter !== 'all') {
    result = result.filter((p) => p.status === statusFilter);
  }

  return result;
}

export async function getProperty(propertyId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      contract: { include: { tenants: true } },
      parentProperty: { select: { id: true, name: true, address: true } },
      units: { select: { id: true, name: true, address: true, type: true, status: true } },
    },
  });
  if (!property) {
    throw new AppError('errors:property.notFound', 404, 'NOT_FOUND');
  }
  const status = computeStatus(property.contract);
  return { ...property, status };
}

export async function getPropertyExpenseReceipts(propertyId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { contract: { include: { tenants: { include: { expenseReceipts: { orderBy: { period: 'desc' } } } } } } },
  });
  if (!property) throw new AppError('errors:property.notFound', 404, 'NOT_FOUND');
  return property.contract?.tenants.flatMap((t) => t.expenseReceipts) ?? [];
}

export async function updateProperty(userId: string, propertyId: string, input: UpdatePropertyInput) {
  if (input.parentPropertyId) {
    await assertValidParent(userId, propertyId, input.parentPropertyId);
  }
  const property = await prisma.property.update({
    where: { id: propertyId },
    data: input,
  });
  return property;
}

export async function deleteProperty(propertyId: string, userId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      photos: true,
      contract: { include: { document: true } },
    },
  });

  if (!property) {
    throw new AppError('errors:property.notFound', 404, 'NOT_FOUND');
  }
  if (property.userId !== userId) {
    throw new AppError('errors:property.accessDenied', 403, 'FORBIDDEN');
  }

  const filesToRemove = [
    ...property.photos.flatMap(photo => [photo.fileUrl, photo.thumbnailUrl]),
    property.contract?.document?.fileUrl,
  ].filter(Boolean);

  await prisma.$transaction(async (tx) => {
    await tx.claimHistory.deleteMany({
      where: { claim: { tenant: { contract: { propertyId } } } },
    });
    await tx.claimNote.deleteMany({
      where: { claim: { tenant: { contract: { propertyId } } } },
    });
    await tx.claim.deleteMany({
      where: { tenant: { contract: { propertyId } } },
    });
    await tx.cashReceipt.deleteMany({
      where: { payment: { contract: { propertyId } } },
    });
    await tx.property.delete({ where: { id: propertyId } });
  });

  await Promise.allSettled(filesToRemove.map(file => removeUploadedFile(file)));
  return { deleted: true };
}


