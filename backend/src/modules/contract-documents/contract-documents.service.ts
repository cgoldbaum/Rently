import prisma from '../../lib/prisma';
import { UPLOAD_URL_PREFIX } from '../../lib/multer';
import fs from 'fs';
import path from 'path';

async function assertContractOwnership(contractId: string, userId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { property: true },
  });
  if (!contract) throw Object.assign(new Error('Contract not found'), { code: 'NOT_FOUND', status: 404 });
  if (contract.property.userId !== userId) throw Object.assign(new Error('Access denied'), { code: 'FORBIDDEN', status: 403 });
  return contract;
}

export async function getDocument(contractId: string, userId: string) {
  await assertContractOwnership(contractId, userId);
  const doc = await prisma.contractDocument.findUnique({ where: { contractId } });
  if (!doc) throw Object.assign(new Error('No document found'), { code: 'NOT_FOUND', status: 404 });
  return doc;
}

export async function uploadDocument(contractId: string, userId: string, file: Express.Multer.File) {
  await assertContractOwnership(contractId, userId);

  const existing = await prisma.contractDocument.findUnique({ where: { contractId } });
  if (existing) {
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const oldPath = path.join(uploadDir, path.basename(existing.fileUrl));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    return prisma.contractDocument.update({
      where: { contractId },
      data: { fileUrl: `${UPLOAD_URL_PREFIX}/${file.filename}`, fileName: file.originalname, uploadedBy: userId, uploadedAt: new Date() },
    });
  }

  return prisma.contractDocument.create({
    data: {
      contractId,
      fileUrl: `${UPLOAD_URL_PREFIX}/${file.filename}`,
      fileName: file.originalname,
      uploadedBy: userId,
    },
  });
}
