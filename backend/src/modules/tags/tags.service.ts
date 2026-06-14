import { AppError } from '../../lib/AppError';
import prisma from '../../lib/prisma';

export async function listTags(userId: string) {
  return prisma.photoTag.findMany({
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
}

export async function createTag(userId: string, data: { name: string; color?: string }) {
  return prisma.photoTag.create({
    data: { name: data.name, color: data.color },
  });
}

export async function updateTag(tagId: string, userId: string, data: { name?: string; color?: string }) {
  const tag = await prisma.photoTag.findUnique({ where: { id: tagId } });
  if (!tag) throw new AppError('Tag not found', 404, 'NOT_FOUND');
  if (tag.isDefault) throw new AppError('Cannot edit default tags', 400, 'BAD_REQUEST');
  return prisma.photoTag.update({
    where: { id: tagId },
    data: { name: data.name, color: data.color },
  });
}

export async function deleteTag(tagId: string, userId: string) {
  const tag = await prisma.photoTag.findUnique({ where: { id: tagId } });
  if (!tag) throw new AppError('Tag not found', 404, 'NOT_FOUND');
  if (tag.isDefault) throw new AppError('Cannot delete default tags', 400, 'BAD_REQUEST');
  await prisma.propertyPhotoTag.deleteMany({ where: { tagId } });
  await prisma.photoTag.delete({ where: { id: tagId } });
}
