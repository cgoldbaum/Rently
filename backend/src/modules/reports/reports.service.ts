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

  const statusLabel: Record<string, string> = {
    PAID: 'Pagado',
    PENDING: 'Pendiente',
    LATE: 'En mora',
    PENDING_CONFIRMATION: 'Pend. confirmación',
  };

  const totalPaid = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'PENDING' || p.status === 'LATE').reduce((s, p) => s + p.amount, 0);

  // A4: 595pt wide. Margin 40 each side → usable 515pt (x: 40–555)
  const ML = 40;
  const MR = 555;
  const ROW_H = 22;
  const PAGE_BOTTOM = 800;

  // Columns: x = left edge, w = width (gap between columns is handled by widths)
  const cols = [
    { label: 'Propiedad',  x: ML,        w: 145 },
    { label: 'Inquilino',  x: ML + 150,  w: 100 },
    { label: 'Período',    x: ML + 255,  w: 55  },
    { label: 'Monto',      x: ML + 315,  w: 75  },
    { label: 'Venc.',      x: ML + 395,  w: 65  },
    { label: 'Estado',     x: ML + 465,  w: 90  },
  ];

  function trunc(text: string, maxChars: number): string {
    return text.length > maxChars ? text.slice(0, maxChars - 1) + '…' : text;
  }

  // Draw a full row using absolute x,y per cell so columns never bleed into each other
  function drawRow(doc: PDFKit.PDFDocument, y: number, cells: string[], isHeader: boolean) {
    if (isHeader) {
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#555');
    } else {
      doc.fontSize(9).font('Helvetica').fillColor('#111');
    }
    cells.forEach((text, i) => {
      const col = cols[i];
      doc.text(text, col.x, y, { width: col.w, lineBreak: false });
    });
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: ML, size: 'A4', autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Header ──────────────────────────────────────────────────────────────
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#111')
      .text('Reporte de Cobros — Rently', ML, 45, { width: MR - ML, align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#666')
      .text(`Generado el ${new Date().toLocaleDateString('es-AR')}`, ML, doc.y + 4, { width: MR - ML, align: 'center' });

    doc.y += 18;

    // ── Summary ──────────────────────────────────────────────────────────────
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#111').text('Resumen', ML, doc.y);
    doc.moveTo(ML, doc.y + 2).lineTo(MR, doc.y + 2).strokeColor('#ccc').lineWidth(0.5).stroke();
    doc.y += 8;

    doc.fontSize(10).font('Helvetica').fillColor('#333');
    doc.text(`Total cobros: ${payments.length}`, ML, doc.y);
    doc.text(`Pagados: ${payments.filter(p => p.status === 'PAID').length}   (USD ${totalPaid.toLocaleString('es-AR')})`, ML, doc.y + 14);
    doc.text(`Pendientes / En mora: ${payments.filter(p => p.status === 'PENDING' || p.status === 'LATE').length}   (USD ${totalPending.toLocaleString('es-AR')})`, ML, doc.y + 28);
    doc.y += 50;

    // ── Table ────────────────────────────────────────────────────────────────
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#111').text('Detalle de cobros', ML, doc.y);
    doc.moveTo(ML, doc.y + 2).lineTo(MR, doc.y + 2).strokeColor('#ccc').lineWidth(0.5).stroke();
    doc.y += 10;

    // Header row
    const headerY = doc.y;
    drawRow(doc, headerY, cols.map(c => c.label), true);
    doc.y = headerY + ROW_H;
    doc.moveTo(ML, doc.y).lineTo(MR, doc.y).strokeColor('#ccc').lineWidth(0.5).stroke();
    doc.y += 4;

    // Data rows
    for (const p of payments) {
      if (doc.y > PAGE_BOTTOM) {
        doc.addPage();
        doc.y = ML;
        // Repeat header on new page
        const hy = doc.y;
        drawRow(doc, hy, cols.map(c => c.label), true);
        doc.y = hy + ROW_H;
        doc.moveTo(ML, doc.y).lineTo(MR, doc.y).strokeColor('#ccc').lineWidth(0.5).stroke();
        doc.y += 4;
      }

      const rowY = doc.y;
      const cells = [
        trunc(p.contract.property.name ?? p.contract.property.address, 22),
        trunc(p.contract.tenant?.name ?? '—', 17),
        p.period,
        `USD ${p.amount.toLocaleString('es-AR')}`,
        p.dueDate.toLocaleDateString('es-AR'),
        statusLabel[p.status] ?? p.status,
      ];
      drawRow(doc, rowY, cells, false);
      doc.y = rowY + ROW_H;
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    doc.y += 12;
    doc.moveTo(ML, doc.y).lineTo(MR, doc.y).strokeColor('#ddd').lineWidth(0.5).stroke();
    doc.y += 6;
    doc.fontSize(8).font('Helvetica').fillColor('#aaa')
      .text(`Rently · ${new Date().toLocaleDateString('es-AR')}`, ML, doc.y, { width: MR - ML, align: 'right' });

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
