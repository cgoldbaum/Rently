import prisma from '../../lib/prisma';
import { UPLOAD_URL_PREFIX } from '../../lib/multer';

async function assertOwnership(propertyId: string, userId: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw Object.assign(new Error('Property not found'), { code: 'NOT_FOUND', status: 404 });
  if (property.userId !== userId) throw Object.assign(new Error('Access denied'), { code: 'FORBIDDEN', status: 403 });
}

function badRequest(message: string) {
  return Object.assign(new Error(message), { code: 'BAD_REQUEST', status: 400 });
}

async function assertFolderInProperty(propertyId: string, folderId: string) {
  const folder = await prisma.photoFolder.findUnique({ where: { id: folderId } });
  if (!folder || folder.propertyId !== propertyId) {
    throw badRequest('Folder does not belong to this property');
  }
}

async function assertTagsExist(tagIds: string[]) {
  if (tagIds.length === 0) return;
  const found = await prisma.photoTag.findMany({
    where: { id: { in: tagIds } },
    select: { id: true },
  });
  if (found.length !== tagIds.length) {
    throw badRequest('One or more tags do not exist');
  }
}

export async function listPhotos(propertyId: string, userId: string, folderId?: string) {
  await assertOwnership(propertyId, userId);
  const where: any = { propertyId, deletedAt: null };
  if (folderId) where.folderId = folderId;
  return prisma.propertyPhoto.findMany({
    where,
    include: { tags: { include: { tag: true } } },
    orderBy: { uploadedAt: 'desc' },
  });
}

export async function addPhotos(
  propertyId: string,
  userId: string,
  files: Express.Multer.File[],
  options?: { folderId?: string; tagIds?: string[]; caption?: string },
) {
  await assertOwnership(propertyId, userId);
  if (options?.folderId) await assertFolderInProperty(propertyId, options.folderId);
  if (options?.tagIds) await assertTagsExist(options.tagIds);
  const records = files.map(f => ({
    propertyId,
    fileUrl: `${UPLOAD_URL_PREFIX}/${f.filename}`,
    thumbnailUrl: `${UPLOAD_URL_PREFIX}/${f.filename}`,
    folderId: options?.folderId ?? null,
    caption: options?.caption ?? null,
  }));
  await prisma.propertyPhoto.createMany({ data: records });

  const created = await prisma.propertyPhoto.findMany({
    where: { propertyId, deletedAt: null },
    orderBy: { uploadedAt: 'desc' },
    take: files.length,
  });

  if (options?.tagIds?.length) {
    const tagData = created.flatMap(p => options.tagIds!.map(tagId => ({ photoId: p.id, tagId })));
    await prisma.propertyPhotoTag.createMany({ data: tagData });
  }

  return prisma.propertyPhoto.findMany({
    where: { propertyId, deletedAt: null },
    include: { tags: { include: { tag: true } } },
    orderBy: { uploadedAt: 'desc' },
  });
}

export async function updatePhoto(
  propertyId: string,
  photoId: string,
  userId: string,
  data: { folderId?: string | null; tagIds?: string[]; caption?: string },
) {
  await assertOwnership(propertyId, userId);
  const photo = await prisma.propertyPhoto.findUnique({ where: { id: photoId } });
  if (!photo || photo.propertyId !== propertyId || photo.deletedAt) {
    throw Object.assign(new Error('Photo not found'), { code: 'NOT_FOUND', status: 404 });
  }

  if (data.folderId) await assertFolderInProperty(propertyId, data.folderId);
  if (data.tagIds) await assertTagsExist(data.tagIds);

  const updateData: any = {};
  if (data.caption !== undefined) updateData.caption = data.caption;
  if (data.folderId !== undefined) updateData.folderId = data.folderId;

  await prisma.$transaction(async (tx) => {
    if (Object.keys(updateData).length > 0) {
      await tx.propertyPhoto.update({ where: { id: photoId }, data: updateData });
    }
    if (data.tagIds !== undefined) {
      await tx.propertyPhotoTag.deleteMany({ where: { photoId } });
      if (data.tagIds.length > 0) {
        await tx.propertyPhotoTag.createMany({
          data: data.tagIds.map(tagId => ({ photoId, tagId })),
        });
      }
    }
  });

  return prisma.propertyPhoto.findUnique({
    where: { id: photoId },
    include: { tags: { include: { tag: true } } },
  });
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
