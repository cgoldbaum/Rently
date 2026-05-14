import prisma from '../../lib/prisma';
import { CreatePropertyInput, UpdatePropertyInput } from './properties.schema';
import { PropertyStatus } from '@prisma/client';
import PDFDocument from 'pdfkit';
import fs from 'fs/promises';
import path from 'path';

export function computeStatus(contract: { startDate: Date; endDate: Date; tenant?: unknown | null } | null): PropertyStatus {
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

export async function getPropertyExpenseReceipts(propertyId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { contract: { include: { tenant: { include: { expenseReceipts: { orderBy: { period: 'desc' } } } } } } },
  });
  if (!property) throw Object.assign(new Error('Property not found'), { code: 'NOT_FOUND', status: 404 });
  return property.contract?.tenant?.expenseReceipts ?? [];
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

  const BRAND  = '#C4713A';
  const DARK   = '#2B1D10';
  const MUTED  = '#7A6757';
  const LIGHT  = '#F5F0E8';
  const BORDER = '#DDD5C5';
  const WHITE  = '#FFFFFF';
  const ML     = 40;
  const PAGE_W = 595;
  const CONTENT = PAGE_W - ML * 2;

  const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
    OCCUPIED:      { bg: '#DCF0DE', text: '#3A6B3E' },
    VACANT:        { bg: '#DDEEFF', text: '#1E4D8C' },
    IN_ARREARS:    { bg: '#FCE4E4', text: '#922020' },
    EXPIRING_SOON: { bg: '#FFF0D6', text: '#8A5200' },
  };

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4', info: { Title: 'Ficha de propiedad — Rently' } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Header bar ──────────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 72).fill(BRAND);
    doc.fontSize(20).font('Helvetica-Bold').fillColor(WHITE)
      .text('Ficha de Propiedad', ML, 20, { width: CONTENT, lineBreak: false });
    doc.fontSize(10).font('Helvetica').fillColor('rgba(255,255,255,0.75)')
      .text('Rently', ML, 44, { lineBreak: false });
    doc.fontSize(10).font('Helvetica').fillColor('rgba(255,255,255,0.75)')
      .text(`Generado el ${new Date().toLocaleDateString('es-AR')}`, ML, 44, { width: CONTENT, align: 'right', lineBreak: false });

    let y = 88;

    // ── Property name + address ──────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(17).fillColor(DARK)
      .text(property.name ?? property.address, ML, y, { width: CONTENT });
    y = doc.y + 3;
    if (property.name) {
      doc.font('Helvetica').fontSize(11).fillColor(MUTED)
        .text(property.address, ML, y, { width: CONTENT });
      y = doc.y + 3;
    }

    // Status pill
    const sc = STATUS_COLOR[property.status] ?? { bg: LIGHT, text: MUTED };
    const statusLabel = STATUS_LABELS[property.status] ?? property.status;
    doc.roundedRect(ML, y + 4, 88, 18, 4).fill(sc.bg);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(sc.text)
      .text(statusLabel, ML, y + 8, { width: 88, align: 'center', lineBreak: false });
    y += 32;

    doc.moveTo(ML, y).lineTo(ML + CONTENT, y).strokeColor(BORDER).lineWidth(0.5).stroke();
    y += 14;

    // ── Section helpers ──────────────────────────────────────────────────────
    const sectionTitle = (label: string) => {
      doc.rect(ML, y, CONTENT, 22).fill(DARK);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(WHITE)
        .text(label.toUpperCase(), ML + 10, y + 7, { width: CONTENT - 20, characterSpacing: 0.8, lineBreak: false });
      y += 28;
    };

    const colW = (CONTENT - 12) / 2;
    let col = 0;
    let rowStartY = y;

    const field = (label: string, value: string) => {
      const x = col === 0 ? ML : ML + colW + 12;
      doc.font('Helvetica').fontSize(7.5).fillColor(MUTED)
        .text(label, x, y, { width: colW, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK)
        .text(value, x, doc.y + 2, { width: colW });
      if (col === 0) {
        rowStartY = y;
        col = 1;
      } else {
        y = Math.max(doc.y, rowStartY + 30) + 8;
        col = 0;
      }
    };

    // ── Datos del inmueble ───────────────────────────────────────────────────
    sectionTitle('Datos del inmueble');
    field('Tipo', TYPE_LABELS[property.type] ?? property.type);
    field('Superficie', `${property.surface} m²`);
    if (property.antiquity != null) field('Antigüedad', `${property.antiquity} año${property.antiquity !== 1 ? 's' : ''}`);
    if (property.condition) field('Estado', CONDITION_LABELS[property.condition] ?? property.condition);
    if (col === 1) { y = Math.max(doc.y, rowStartY + 30) + 8; col = 0; }
    y += 6;

    // ── Contrato ─────────────────────────────────────────────────────────────
    if (property.contract) {
      const c = property.contract;
      const currencySymbol = (c as any).currency === 'ARS' ? '$' : 'USD';
      sectionTitle('Contrato');
      field('Alquiler actual', `${currencySymbol} ${c.currentAmount.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`);
      field('Monto inicial',   `${currencySymbol} ${c.initialAmount.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`);
      field('Índice de ajuste', c.indexType);
      field('Frecuencia', `Cada ${c.adjustFrequency} mes${c.adjustFrequency !== 1 ? 'es' : ''}`);
      field('Inicio',          new Date(c.startDate).toLocaleDateString('es-AR'));
      field('Vencimiento',     new Date(c.endDate).toLocaleDateString('es-AR'));
      field('Día de pago',     `Día ${c.paymentDay} de cada mes`);
      if (c.nextAdjustDate) field('Próximo ajuste', new Date(c.nextAdjustDate).toLocaleDateString('es-AR'));
      if (col === 1) { y = Math.max(doc.y, rowStartY + 30) + 8; col = 0; }
      y += 6;

      if (c.tenant) {
        sectionTitle('Inquilino');
        field('Nombre', c.tenant.name);
        field('Email',  c.tenant.email);
        if (c.tenant.phone) field('Teléfono', c.tenant.phone);
        if (col === 1) { y = Math.max(doc.y, rowStartY + 30) + 8; col = 0; }
        y += 6;
      }
    }

    // ── Descripción ───────────────────────────────────────────────────────────
    if (property.description) {
      sectionTitle('Descripción');
      doc.font('Helvetica').fontSize(10.5).fillColor(DARK)
        .text(property.description, ML, y, { width: CONTENT, lineGap: 3 });
      y = doc.y + 14;
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    y += 6;
    doc.moveTo(ML, y).lineTo(ML + CONTENT, y).strokeColor(BORDER).lineWidth(0.5).stroke();
    y += 7;
    doc.font('Helvetica').fontSize(7.5).fillColor(MUTED)
      .text('Rently · Ficha de Propiedad', ML, y, { lineBreak: false });
    doc.font('Helvetica').fontSize(7.5).fillColor(MUTED)
      .text(`ID: ${property.id}`, ML, y, { width: CONTENT, align: 'right', lineBreak: false });

    doc.end();
  });
}
