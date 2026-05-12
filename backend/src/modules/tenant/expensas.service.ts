import prisma from '../../lib/prisma';
import { UPLOAD_URL_PREFIX } from '../../lib/multer';
import fs from 'fs';
import path from 'path';

function notFound(msg = 'Not found') {
  return Object.assign(new Error(msg), { code: 'NOT_FOUND', status: 404 });
}

export async function getExpenseReceipts(tenantId: string) {
  return prisma.expenseReceipt.findMany({
    where: { tenantId },
    orderBy: { period: 'desc' },
  });
}

export async function uploadExpenseReceipt(
  tenantId: string,
  period: string,
  file: Express.Multer.File,
) {
  const existing = await prisma.expenseReceipt.findUnique({
    where: { tenantId_period: { tenantId, period } },
  });

  if (existing) {
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const oldPath = path.join(uploadDir, path.basename(existing.fileUrl));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

    return prisma.expenseReceipt.update({
      where: { tenantId_period: { tenantId, period } },
      data: {
        fileUrl: `${UPLOAD_URL_PREFIX}/${file.filename}`,
        fileName: file.originalname,
        uploadedAt: new Date(),
      },
    });
  }

  return prisma.expenseReceipt.create({
    data: {
      tenantId,
      period,
      fileUrl: `${UPLOAD_URL_PREFIX}/${file.filename}`,
      fileName: file.originalname,
    },
  });
}

export async function deleteExpenseReceipt(tenantId: string, receiptId: string) {
  const receipt = await prisma.expenseReceipt.findUnique({ where: { id: receiptId } });
  if (!receipt || receipt.tenantId !== tenantId) throw notFound();

  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  const filePath = path.join(uploadDir, path.basename(receipt.fileUrl));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  return prisma.expenseReceipt.delete({ where: { id: receiptId } });
}
