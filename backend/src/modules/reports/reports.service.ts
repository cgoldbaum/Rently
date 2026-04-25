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
    PENDING_CONFIRMATION: 'Pendiente confirmación',
  };

  const totalPaid = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'PENDING' || p.status === 'LATE').reduce((s, p) => s + p.amount, 0);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#111').text('Reporte de Cobros — Rently', { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#555')
      .text(`Generado el ${new Date().toLocaleDateString('es-AR')}`, { align: 'center' });
    doc.moveDown();

    // Summary
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#111').text('Resumen');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(11).fillColor('#333');
    doc.text(`Total cobros: ${payments.length}`);
    doc.text(`Pagados: ${payments.filter(p => p.status === 'PAID').length}  (USD ${totalPaid.toLocaleString('es-AR')})`);
    doc.text(`Pendientes / En mora: ${payments.filter(p => p.status === 'PENDING' || p.status === 'LATE').length}  (USD ${totalPending.toLocaleString('es-AR')})`);
    doc.moveDown();

    // Table header
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#111').text('Detalle de cobros');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(0.3);

    const colX = { property: 50, tenant: 190, period: 300, amount: 370, due: 430, status: 500 };
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#555');
    doc.text('Propiedad', colX.property, doc.y, { width: 135, continued: true });
    doc.text('Inquilino', colX.tenant, undefined, { width: 105, continued: true });
    doc.text('Período', colX.period, undefined, { width: 65, continued: true });
    doc.text('Monto', colX.amount, undefined, { width: 55, continued: true });
    doc.text('Venc.', colX.due, undefined, { width: 65, continued: true });
    doc.text('Estado', colX.status, undefined, { width: 60 });
    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).strokeColor('#ddd').stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica').fontSize(9).fillColor('#111');
    for (const p of payments) {
      if (doc.y > 750) {
        doc.addPage();
        doc.y = 50;
      }
      const rowY = doc.y;
      const propName = p.contract.property.name ?? p.contract.property.address;
      const tenantName = p.contract.tenant?.name ?? '—';
      const dueStr = p.dueDate.toLocaleDateString('es-AR');
      const label = statusLabel[p.status] ?? p.status;
      doc.text(propName, colX.property, rowY, { width: 135, continued: true });
      doc.text(tenantName, colX.tenant, undefined, { width: 105, continued: true });
      doc.text(p.period, colX.period, undefined, { width: 65, continued: true });
      doc.text(`USD ${p.amount.toLocaleString('es-AR')}`, colX.amount, undefined, { width: 55, continued: true });
      doc.text(dueStr, colX.due, undefined, { width: 65, continued: true });
      doc.text(label, colX.status, undefined, { width: 60 });
    }

    doc.moveDown();
    doc.font('Helvetica').fontSize(9).fillColor('#aaa')
      .text(`Rently · ${new Date().toLocaleDateString('es-AR')}`, { align: 'right' });
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
