import prisma from '../../lib/prisma';
import { CreatePropertyInput, UpdatePropertyInput } from './properties.schema';
import { PropertyStatus } from '@prisma/client';
import PDFDocument from 'pdfkit';
import fs from 'fs/promises';
import path from 'path';

function computeStatus(contract: { startDate: Date; endDate: Date; tenant?: unknown | null } | null): PropertyStatus {
  if (!contract || !contract.tenant) return 'VACANT';
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

export async function deleteProperty(propertyId: string, userId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      photos: true,
      contract: { include: { document: true } },
    },
  });

  if (!property) {
    throw Object.assign(new Error('Property not found'), { code: 'NOT_FOUND', status: 404 });
  }
  if (property.userId !== userId) {
    throw Object.assign(new Error('Access denied'), { code: 'FORBIDDEN', status: 403 });
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

export async function exportDescriptionPdf(propertyId: string, userId: string): Promise<Buffer> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { contract: true, photos: { where: { deletedAt: null }, take: 4 } },
  });
  if (!property) throw Object.assign(new Error('Property not found'), { code: 'NOT_FOUND', status: 404 });
  if (property.userId !== userId) throw Object.assign(new Error('Access denied'), { code: 'FORBIDDEN', status: 403 });

  const TYPE_LABELS: Record<string, string> = {
    APARTMENT: 'Departamento', HOUSE: 'Casa', COMMERCIAL: 'Local comercial', PH: 'PH',
  };

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(22).font('Helvetica-Bold').text('Descripción de Propiedad — Rently', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(property.name ?? property.address);
    if (property.name) doc.fontSize(12).font('Helvetica').fillColor('#555').text(property.address);
    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(12).fillColor('#000').text('Datos del inmueble');
    doc.font('Helvetica').fontSize(11);
    doc.text(`Tipo: ${TYPE_LABELS[property.type] ?? property.type}`);
    doc.text(`Superficie: ${property.surface} m²`);
    if (property.antiquity != null) doc.text(`Antigüedad: ${property.antiquity} años`);
    if (property.contract) {
      doc.text(`Alquiler actual: USD ${property.contract.currentAmount.toLocaleString('es-AR')}`);
      doc.text(`Índice de ajuste: ${property.contract.indexType}`);
    }
    doc.moveDown();

    if (property.description) {
      doc.font('Helvetica-Bold').fontSize(12).text('Descripción');
      doc.font('Helvetica').fontSize(11).text(property.description, { paragraphGap: 4 });
      doc.moveDown();
    }

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#888').text(`Generado por Rently · ${new Date().toLocaleDateString('es-AR')}`);
    doc.end();
  });
}
