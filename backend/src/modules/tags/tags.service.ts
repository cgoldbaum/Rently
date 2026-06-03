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
  if (!tag) throw Object.assign(new Error('Tag not found'), { code: 'NOT_FOUND', status: 404 });
  if (tag.isDefault) throw Object.assign(new Error('Cannot edit default tags'), { code: 'BAD_REQUEST', status: 400 });
  return prisma.photoTag.update({
    where: { id: tagId },
    data: { name: data.name, color: data.color },
  });
}

export async function deleteTag(tagId: string, userId: string) {
  const tag = await prisma.photoTag.findUnique({ where: { id: tagId } });
  if (!tag) throw Object.assign(new Error('Tag not found'), { code: 'NOT_FOUND', status: 404 });
  if (tag.isDefault) throw Object.assign(new Error('Cannot delete default tags'), { code: 'BAD_REQUEST', status: 400 });
  await prisma.propertyPhotoTag.deleteMany({ where: { tagId } });
  await prisma.photoTag.delete({ where: { id: tagId } });
}
