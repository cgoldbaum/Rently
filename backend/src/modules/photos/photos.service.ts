import prisma from '../../lib/prisma';
import { UPLOAD_URL_PREFIX } from '../../lib/multer';
import fs from 'fs';
import path from 'path';

async function assertOwnership(propertyId: string, userId: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw Object.assign(new Error('Property not found'), { code: 'NOT_FOUND', status: 404 });
  if (property.userId !== userId) throw Object.assign(new Error('Access denied'), { code: 'FORBIDDEN', status: 403 });
}

export async function listPhotos(propertyId: string, userId: string) {
  await assertOwnership(propertyId, userId);
  return prisma.propertyPhoto.findMany({
    where: { propertyId },
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
  return prisma.propertyPhoto.findMany({ where: { propertyId }, orderBy: { uploadedAt: 'desc' } });
}

export async function deletePhoto(propertyId: string, photoId: string, userId: string) {
  await assertOwnership(propertyId, userId);
  const photo = await prisma.propertyPhoto.findUnique({ where: { id: photoId } });
  if (!photo || photo.propertyId !== propertyId) {
    throw Object.assign(new Error('Photo not found'), { code: 'NOT_FOUND', status: 404 });
  }
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  const filename = path.basename(photo.fileUrl);
  const filePath = path.join(uploadDir, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  await prisma.propertyPhoto.delete({ where: { id: photoId } });

  // Notify tenant if the property has a contract with a registered user
  const contract = await prisma.contract.findUnique({
    where: { propertyId },
    include: { property: true, tenant: true },
  });
  if (contract?.tenant?.userId) {
    const propName = contract.property.name ?? contract.property.address;
    await prisma.notification.create({
      data: {
        userId: contract.tenant.userId,
        type: 'PHOTO',
        message: `El propietario actualizó el registro fotográfico de ${propName}.`,
      },
    });
  }
}
