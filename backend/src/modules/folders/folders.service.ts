import { AppError } from '../../lib/AppError';
import prisma from '../../lib/prisma';

async function assertOwnership(propertyId: string, userId: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new AppError('errors:property.notFound', 404, 'NOT_FOUND');
  if (property.userId !== userId) throw new AppError('errors:folder.accessDenied', 403, 'FORBIDDEN');
}

export async function listFolders(propertyId: string, userId: string) {
  await assertOwnership(propertyId, userId);
  return prisma.photoFolder.findMany({
    where: { propertyId },
    include: { _count: { select: { photos: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function createFolder(propertyId: string, userId: string, data: { name: string; description?: string }) {
  await assertOwnership(propertyId, userId);
  return prisma.photoFolder.create({
    data: { propertyId, name: data.name, description: data.description },
  });
}

export async function updateFolder(folderId: string, propertyId: string, userId: string, data: { name?: string; description?: string }) {
  await assertOwnership(propertyId, userId);
  const folder = await prisma.photoFolder.findUnique({ where: { id: folderId } });
  if (!folder || folder.propertyId !== propertyId) {
    throw new AppError('errors:folder.notFound', 404, 'NOT_FOUND');
  }
  return prisma.photoFolder.update({
    where: { id: folderId },
    data: { name: data.name, description: data.description },
  });
}

export async function deleteFolder(folderId: string, propertyId: string, userId: string) {
  await assertOwnership(propertyId, userId);
  const folder = await prisma.photoFolder.findUnique({ where: { id: folderId } });
  if (!folder || folder.propertyId !== propertyId) {
    throw new AppError('errors:folder.notFound', 404, 'NOT_FOUND');
  }
  await prisma.propertyPhoto.updateMany({
    where: { folderId },
    data: { folderId: null },
  });
  await prisma.photoFolder.delete({ where: { id: folderId } });
}
