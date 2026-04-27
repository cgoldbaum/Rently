import prisma from '../../lib/prisma';
import { UPLOAD_URL_PREFIX } from '../../lib/multer';

async function assertOwnership(propertyId: string, userId: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw Object.assign(new Error('Property not found'), { code: 'NOT_FOUND', status: 404 });
  if (property.userId !== userId) throw Object.assign(new Error('Access denied'), { code: 'FORBIDDEN', status: 403 });
}

export async function listPhotos(propertyId: string, userId: string) {
  await assertOwnership(propertyId, userId);
  return prisma.propertyPhoto.findMany({
    where: { propertyId, deletedAt: null },
    orderBy: { uploadedAt: 'desc' },
  });
}

export async function addPhotos(propertyId: string, userId: string, files: Express.Multer.File[]) {
  await assertOwnership(propertyId, userId);
  const records = files.map(f => ({
    propertyId,
    fileUrl: `${UPLOAD_URL_PREFIX}/${f.filename}`,
    thumbnailUrl: `${UPLOAD_URL_PREFIX}/${f.filename}`,
  }));
  await prisma.propertyPhoto.createMany({ data: records });
  return prisma.propertyPhoto.findMany({ where: { propertyId, deletedAt: null }, orderBy: { uploadedAt: 'desc' } });
}

export async function deletePhoto(propertyId: string, photoId: string, userId: string) {
  await assertOwnership(propertyId, userId);
  const photo = await prisma.propertyPhoto.findUnique({ where: { id: photoId } });
  if (!photo || photo.propertyId !== propertyId || photo.deletedAt) {
    throw Object.assign(new Error('Photo not found'), { code: 'NOT_FOUND', status: 404 });
  }

  const contract = await prisma.contract.findUnique({
    where: { propertyId },
    include: { property: true, tenant: true },
  });
  const notifiedTenant = Boolean(contract?.tenant?.userId);

  await prisma.$transaction(async (tx) => {
    await tx.propertyPhoto.update({
      where: { id: photoId },
      data: { deletedAt: new Date(), deletedById: userId },
    });

    if (contract?.tenant?.userId) {
      const propName = contract.property.name ?? contract.property.address;
      await tx.notification.create({
        data: {
          userId: contract.tenant.userId,
          type: 'PHOTO',
          referenceId: photoId,
          message: `El propietario eliminó una foto del inmueble ${propName}. La foto queda guardada como registro.`,
        },
      });
    }
  });

  return { notifiedTenant };
}
