import prisma from '../../lib/prisma';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export async function getIncomeReport(userId: string, from: Date, to: Date, propertyId?: string) {
  const payments = await prisma.payment.findMany({
    where: {
      status: 'PAID',
      paidDate: { gte: from, lte: to },
      contract: {
        property: { userId, ...(propertyId ? { id: propertyId } : {}) },
      },
    },
    include: { contract: { include: { property: true, tenant: true } } },
    orderBy: { paidDate: 'asc' },
  });

  const byProperty: Record<string, { name: string; tenant: string; amount: number }> = {};
  const byMonth: Record<string, number> = {};

  for (const p of payments) {
    const name = p.contract.property.name ?? p.contract.property.address;
    if (!byProperty[name]) byProperty[name] = { name, tenant: p.contract.tenant?.name ?? '—', amount: 0 };
    byProperty[name].amount += p.amount;

    const monthKey = p.paidDate!.toISOString().slice(0, 7);
    byMonth[monthKey] = (byMonth[monthKey] ?? 0) + p.amount;
  }

  const totalGross = payments.reduce((s, p) => s + p.amount, 0);
  const totalFee = Math.round(totalGross * 0.01);
  const totalNet = totalGross - totalFee;

  return {
    summary: { total_gross: totalGross, total_fee: totalFee, total_net: totalNet },
    by_property: Object.values(byProperty),
    by_month: Object.entries(byMonth).map(([month, amount]) => ({ month, amount })).sort((a, b) => a.month.localeCompare(b.month)),
    payments,
  };
}

export async function exportIncomeXlsx(userId: string, from: Date, to: Date, propertyId?: string): Promise<Buffer> {
  const { by_property, by_month, summary, payments } = await getIncomeReport(userId, from, to, propertyId);

  const workbook = new ExcelJS.Workbook();

  const summarySheet = workbook.addWorksheet('Resumen');
  summarySheet.addRow(['Reporte de Ingresos — Rently']);
  summarySheet.addRow([`Período: ${from.toLocaleDateString('es-AR')} — ${to.toLocaleDateString('es-AR')}`]);
  summarySheet.addRow([]);
  summarySheet.addRow(['Ingreso bruto', summary.total_gross]);
  summarySheet.addRow(['Fee (1%)', summary.total_fee]);
  summarySheet.addRow(['Ingreso neto', summary.total_net]);
  summarySheet.addRow([]);
  summarySheet.addRow(['Por propiedad', '', '']);
  summarySheet.addRow(['Propiedad', 'Inquilino', 'Total']);
  for (const r of by_property) summarySheet.addRow([r.name, r.tenant, r.amount]);
  summarySheet.addRow([]);
  summarySheet.addRow(['Por mes', '']);
  summarySheet.addRow(['Mes', 'Total']);
  for (const m of by_month) summarySheet.addRow([m.month, m.amount]);

  const detailSheet = workbook.addWorksheet('Detalle');
  detailSheet.addRow(['Propiedad', 'Inquilino', 'Período', 'Monto', 'Fecha de pago', 'Método']);
  for (const p of payments) {
    detailSheet.addRow([
      p.contract.property.name ?? p.contract.property.address,
      p.contract.tenant?.name ?? '—',
      p.period,
      p.amount,
      p.paidDate?.toLocaleDateString('es-AR') ?? '',
      p.method ?? '—',
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function exportPaymentsPdf(userId: string): Promise<Buffer> {
  const payments = await prisma.payment.findMany({
    where: { contract: { property: { userId } } },
    include: { contract: { include: { property: true, tenant: true } } },
    orderBy: { dueDate: 'desc' },
  });

  const BRAND   = '#C4713A';
  const DARK    = '#2B1D10';
  const MUTED   = '#7A6757';
  const LIGHT   = '#F5F0E8';
  const BORDER  = '#DDD5C5';
  const WHITE   = '#FFFFFF';

  const STATUS_COLOR: Record<string, { text: string; bg: string }> = {
    PAID:                 { text: '#3A6B3E', bg: '#DCF0DE' },
    PENDING:              { text: '#8A5200', bg: '#FFF0D6' },
    LATE:                 { text: '#922020', bg: '#FCE4E4' },
    PENDING_CONFIRMATION: { text: '#1E4D8C', bg: '#DDEEFF' },
  };
  const STATUS_LABEL: Record<string, string> = {
    PAID: 'Pagado', PENDING: 'Pendiente', LATE: 'En mora', PENDING_CONFIRMATION: 'A confirmar',
  };

  const ML = 40; const MR = 555; const PAGE_W = MR - ML;
  const PAGE_BOTTOM = 790;

  const paidCount    = payments.filter(p => p.status === 'PAID').length;
  const pendingCount = payments.filter(p => p.status === 'PENDING' || p.status === 'LATE').length;
  const totalPaidArs = payments.filter(p => p.status === 'PAID' && p.currency === 'ARS').reduce((s, p) => s + p.amount, 0);
  const totalPaidUsd = payments.filter(p => p.status === 'PAID' && p.currency !== 'ARS').reduce((s, p) => s + p.amount, 0);
  const totalPendingArs = payments.filter(p => (p.status === 'PENDING' || p.status === 'LATE') && p.currency === 'ARS').reduce((s, p) => s + p.amount, 0);
  const totalPendingUsd = payments.filter(p => (p.status === 'PENDING' || p.status === 'LATE') && p.currency !== 'ARS').reduce((s, p) => s + p.amount, 0);

  function fmt(amount: number, currency: string) {
    return currency === 'ARS'
      ? `$ ${amount.toLocaleString('es-AR')}`
      : `USD ${amount.toLocaleString('es-AR')}`;
  }

  function trunc(text: string, max: number) {
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  }

  // Columns must fit ML(40) → MR(555) = 515px total
  const cols = [
    { label: 'Propiedad',   x: ML,        w: 138 }, // 40–178
    { label: 'Inquilino',   x: ML + 141,  w: 100 }, // 181–281
    { label: 'Período',     x: ML + 244,  w: 54  }, // 284–338
    { label: 'Monto',       x: ML + 301,  w: 80  }, // 341–421
    { label: 'Vencimiento', x: ML + 384,  w: 66  }, // 424–490
    { label: 'Estado',      x: ML + 453,  w: 62  }, // 493–555 = MR ✓
  ];
  const ROW_H = 24;

  function drawPageHeader(doc: PDFKit.PDFDocument) {
    // Orange header bar
    doc.rect(0, 0, 595, 72).fill(BRAND);
    doc.fontSize(20).font('Helvetica-Bold').fillColor(WHITE)
      .text('Reporte de Cobros', ML, 20, { width: PAGE_W, lineBreak: false });
    doc.fontSize(10).font('Helvetica').fillColor('rgba(255,255,255,0.75)')
      .text('Rently', ML, 44, { lineBreak: false });
    doc.fontSize(10).font('Helvetica').fillColor('rgba(255,255,255,0.75)')
      .text(`Generado el ${new Date().toLocaleDateString('es-AR')}`, ML, 44, { width: PAGE_W, align: 'right', lineBreak: false });
  }

  function drawTableHeader(doc: PDFKit.PDFDocument, y: number) {
    doc.rect(ML, y, PAGE_W, ROW_H).fill(DARK);
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(WHITE);
    cols.forEach(col => {
      doc.text(col.label.toUpperCase(), col.x + 4, y + 8, { width: col.w - 8, lineBreak: false });
    });
    return y + ROW_H;
  }

  function drawRow(doc: PDFKit.PDFDocument, p: typeof payments[0], y: number, even: boolean) {
    // Row background
    doc.rect(ML, y, PAGE_W, ROW_H).fill(even ? LIGHT : WHITE);

    const sc = STATUS_COLOR[p.status] ?? { text: MUTED, bg: LIGHT };
    const statusText = STATUS_LABEL[p.status] ?? p.status;
    const currency = (p as any).currency ?? 'USD';
    const amountStr = fmt(p.amount, currency);

    doc.fontSize(8.5).font('Helvetica').fillColor(DARK);
    doc.text(trunc(p.contract.property.name ?? p.contract.property.address, 22), cols[0].x + 4, y + 8, { width: cols[0].w - 8, lineBreak: false });
    doc.text(trunc(p.contract.tenant?.name ?? '—', 17), cols[1].x + 4, y + 8, { width: cols[1].w - 8, lineBreak: false });
    doc.text(p.period, cols[2].x + 4, y + 8, { width: cols[2].w - 8, lineBreak: false });
    doc.font('Helvetica-Bold').text(amountStr, cols[3].x + 4, y + 8, { width: cols[3].w - 8, lineBreak: false });
    doc.font('Helvetica').fillColor(MUTED)
      .text(p.dueDate.toLocaleDateString('es-AR'), cols[4].x + 4, y + 8, { width: cols[4].w - 8, lineBreak: false });

    // Status pill
    const pillW = Math.min(cols[5].w - 8, 64);
    const pillX = cols[5].x + 4;
    const pillY = y + 6;
    doc.roundedRect(pillX, pillY, pillW, 12, 3).fill(sc.bg);
    doc.fontSize(7).font('Helvetica-Bold').fillColor(sc.text)
      .text(statusText, pillX, pillY + 2.5, { width: pillW, align: 'center', lineBreak: false });

    // Bottom border
    doc.moveTo(ML, y + ROW_H).lineTo(MR, y + ROW_H).strokeColor(BORDER).lineWidth(0.4).stroke();
    return y + ROW_H;
  }

  function drawFooter(doc: PDFKit.PDFDocument, pageNum: number) {
    const fy = 820;
    doc.moveTo(ML, fy).lineTo(MR, fy).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.fontSize(7.5).font('Helvetica').fillColor(MUTED)
      .text('Rently · Reporte de Cobros', ML, fy + 6, { lineBreak: false });
    doc.text(`Página ${pageNum}`, ML, fy + 6, { width: PAGE_W, align: 'right', lineBreak: false });
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4', autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let pageNum = 1;

    // ── Page 1 header ────────────────────────────────────────────────────────
    drawPageHeader(doc);
    let y = 90;

    // ── Summary cards ────────────────────────────────────────────────────────
    const cardW = (PAGE_W - 16) / 3;
    const cards = [
      { label: 'Total cobros', value: String(payments.length), sub: `${paidCount} pagados · ${pendingCount} pendientes` },
      { label: 'Total cobrado', value: `USD ${totalPaidUsd.toLocaleString('es-AR')}`, sub: totalPaidArs > 0 ? `$ ${totalPaidArs.toLocaleString('es-AR')} en ARS` : 'Sin cobros en ARS' },
      { label: 'Pendiente / Mora', value: `USD ${totalPendingUsd.toLocaleString('es-AR')}`, sub: totalPendingArs > 0 ? `$ ${totalPendingArs.toLocaleString('es-AR')} en ARS` : 'Sin pendientes en ARS' },
    ];

    cards.forEach((card, i) => {
      const cx = ML + i * (cardW + 8);
      doc.roundedRect(cx, y, cardW, 56, 6).fill(WHITE);
      doc.roundedRect(cx, y, 3, 56, 1).fill(BRAND);
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(MUTED)
        .text(card.label.toUpperCase(), cx + 10, y + 9, { width: cardW - 14, lineBreak: false });
      doc.fontSize(14).font('Helvetica-Bold').fillColor(DARK)
        .text(card.value, cx + 10, y + 22, { width: cardW - 14, lineBreak: false });
      doc.fontSize(7.5).font('Helvetica').fillColor(MUTED)
        .text(card.sub, cx + 10, y + 41, { width: cardW - 14, lineBreak: false });
    });
    y += 68;

    // ── Section title ────────────────────────────────────────────────────────
    doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK).text('Detalle de cobros', ML, y);
    y += 16;

    // ── Table ────────────────────────────────────────────────────────────────
    y = drawTableHeader(doc, y);

    payments.forEach((p, idx) => {
      if (y > PAGE_BOTTOM) {
        drawFooter(doc, pageNum++);
        doc.addPage();
        drawPageHeader(doc);
        y = 90;
        y = drawTableHeader(doc, y);
      }
      y = drawRow(doc, p, y, idx % 2 === 0);
    });

    // ── Footer ───────────────────────────────────────────────────────────────
    drawFooter(doc, pageNum);
    doc.end();
  });
}

export async function exportIncomePdf(userId: string, from: Date, to: Date, propertyId?: string): Promise<Buffer> {
  const { by_property, by_month, summary } = await getIncomeReport(userId, from, to, propertyId);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).font('Helvetica-Bold').text('Reporte de Ingresos — Rently', { align: 'center' });
    doc.fontSize(11).font('Helvetica').fillColor('#555')
      .text(`Período: ${from.toLocaleDateString('es-AR')} — ${to.toLocaleDateString('es-AR')}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(13).font('Helvetica-Bold').fillColor('#000').text('Resumen');
    doc.font('Helvetica').fontSize(11);
    doc.text(`Ingreso bruto: USD ${summary.total_gross.toLocaleString('es-AR')}`);
    doc.text(`Fee (1%): USD ${summary.total_fee.toLocaleString('es-AR')}`);
    doc.text(`Ingreso neto: USD ${summary.total_net.toLocaleString('es-AR')}`);
    doc.moveDown();

    doc.fontSize(13).font('Helvetica-Bold').text('Por propiedad');
    doc.font('Helvetica').fontSize(11);
    for (const r of by_property) {
      doc.text(`${r.name} (${r.tenant}): USD ${r.amount.toLocaleString('es-AR')}`);
    }
    doc.moveDown();

    doc.fontSize(13).font('Helvetica-Bold').text('Por mes');
    doc.font('Helvetica').fontSize(11);
    for (const m of by_month) {
      doc.text(`${m.month}: USD ${m.amount.toLocaleString('es-AR')}`);
    }

    doc.moveDown();
    doc.font('Helvetica').fontSize(10).fillColor('#888')
      .text(`Generado por Rently · ${new Date().toLocaleDateString('es-AR')}`, { align: 'right' });
    doc.end();
  });
}
