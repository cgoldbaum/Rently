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
    include: {
      contract: { include: { tenant: true } },
      photos: { where: { deletedAt: null }, take: 1 },
    },
  });
  if (!property) throw Object.assign(new Error('Property not found'), { code: 'NOT_FOUND', status: 404 });
  if (property.userId !== userId) throw Object.assign(new Error('Access denied'), { code: 'FORBIDDEN', status: 403 });

  const TYPE_LABELS: Record<string, string> = {
    APARTMENT: 'Departamento', HOUSE: 'Casa', COMMERCIAL: 'Local comercial', PH: 'PH',
  };
  const CONDITION_LABELS: Record<string, string> = {
    EXCELLENT: 'Excelente', GOOD: 'Bueno', REGULAR: 'Regular', NEEDS_WORK: 'Necesita trabajo',
  };
  const STATUS_LABELS: Record<string, string> = {
    VACANT: 'Vacante', OCCUPIED: 'Ocupada', IN_ARREARS: 'En mora', EXPIRING_SOON: 'Por vencer',
  };

  const BRAND   = '#1a56db';
  const DARK    = '#111827';
  const MUTED   = '#6b7280';
  const LIGHT   = '#f3f4f6';
  const PAGE_W  = 595.28;
  const MARGIN  = 48;
  const CONTENT = PAGE_W - MARGIN * 2;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, info: { Title: 'Ficha de propiedad — Rently' } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Header bar ──────────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 72).fill(BRAND);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20)
      .text('Rently', MARGIN, 22);
    doc.font('Helvetica').fontSize(10).fillColor('rgba(255,255,255,0.75)')
      .text('Ficha de Propiedad', MARGIN, 46);
    doc.fillColor('#ffffff').fontSize(9)
      .text(new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }), 0, 46, { align: 'right', width: PAGE_W - MARGIN });

    let y = 96;

    // ── Property title ───────────────────────────────────────────────────────
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(18)
      .text(property.name ?? property.address, MARGIN, y, { width: CONTENT });
    y = doc.y + 4;
    if (property.name) {
      doc.font('Helvetica').fontSize(11).fillColor(MUTED)
        .text(property.address, MARGIN, y, { width: CONTENT });
      y = doc.y + 4;
    }

    // Status badge
    const statusLabel = STATUS_LABELS[property.status] ?? property.status;
    const badgeColors: Record<string, string> = {
      VACANT: '#d1fae5', OCCUPIED: '#dbeafe', IN_ARREARS: '#fee2e2', EXPIRING_SOON: '#fef3c7',
    };
    const badgeText: Record<string, string> = {
      VACANT: '#065f46', OCCUPIED: '#1e40af', IN_ARREARS: '#991b1b', EXPIRING_SOON: '#92400e',
    };
    const badgeBg = badgeColors[property.status] ?? LIGHT;
    const badgeFg = badgeText[property.status] ?? DARK;
    doc.roundedRect(MARGIN, y + 6, 90, 20, 4).fill(badgeBg);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(badgeFg)
      .text(statusLabel, MARGIN + 6, y + 11, { width: 78, align: 'center' });
    y += 36;

    // Divider
    doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT, y).strokeColor('#e5e7eb').lineWidth(1).stroke();
    y += 16;

    // ── Info grid (2 columns) ────────────────────────────────────────────────
    const sectionTitle = (label: string) => {
      doc.rect(MARGIN, y, CONTENT, 22).fill(LIGHT);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND)
        .text(label.toUpperCase(), MARGIN + 10, y + 6, { width: CONTENT - 20, characterSpacing: 0.8 });
      y += 30;
    };

    const colW = (CONTENT - 12) / 2;
    let col = 0;
    let rowStartY = y;

    const field = (label: string, value: string) => {
      const x = col === 0 ? MARGIN : MARGIN + colW + 12;
      doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(label, x, y, { width: colW });
      doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK).text(value, x, doc.y + 1, { width: colW });
      if (col === 0) {
        rowStartY = y;
        col = 1;
      } else {
        y = Math.max(doc.y, rowStartY + 32) + 6;
        col = 0;
      }
    };

    sectionTitle('Datos del inmueble');
    field('Tipo', TYPE_LABELS[property.type] ?? property.type);
    field('Superficie', `${property.surface} m²`);
    if (property.antiquity != null) field('Antigüedad', `${property.antiquity} año${property.antiquity !== 1 ? 's' : ''}`);
    if (property.condition) field('Estado', CONDITION_LABELS[property.condition] ?? property.condition);
    if (col === 1) { y = Math.max(doc.y, rowStartY + 32) + 6; col = 0; }

    y += 8;

    if (property.contract) {
      const c = property.contract;
      sectionTitle('Contrato');
      field('Alquiler actual', `$${c.currentAmount.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`);
      field('Monto inicial', `$${c.initialAmount.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`);
      field('Índice de ajuste', c.indexType);
      field('Frecuencia de ajuste', `Cada ${c.adjustFrequency} mes${c.adjustFrequency !== 1 ? 'es' : ''}`);
      field('Inicio', new Date(c.startDate).toLocaleDateString('es-AR'));
      field('Vencimiento', new Date(c.endDate).toLocaleDateString('es-AR'));
      field('Día de pago', `Día ${c.paymentDay} de cada mes`);
      field('Próximo ajuste', new Date(c.nextAdjustDate).toLocaleDateString('es-AR'));
      if (col === 1) { y = Math.max(doc.y, rowStartY + 32) + 6; col = 0; }
      y += 8;

      if (c.tenant) {
        sectionTitle('Inquilino');
        field('Nombre', c.tenant.name);
        field('Email', c.tenant.email);
        if (c.tenant.phone) { field('Teléfono', c.tenant.phone); if (col === 1) { y = Math.max(doc.y, rowStartY + 32) + 6; col = 0; } }
        y += 8;
      }
    }

    if (property.description) {
      sectionTitle('Descripción');
      doc.font('Helvetica').fontSize(11).fillColor(DARK)
        .text(property.description, MARGIN, y, { width: CONTENT, lineGap: 4 });
      y = doc.y + 16;
    }

    // ── Footer inline ────────────────────────────────────────────────────────
    y += 8;
    doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT, y).strokeColor('#e5e7eb').lineWidth(1).stroke();
    y += 8;
    doc.font('Helvetica').fontSize(8).fillColor(MUTED)
      .text(`Generado automáticamente por Rently · ID: ${property.id}`, MARGIN, y, { width: CONTENT, align: 'center' });

    doc.end();
  });
}
