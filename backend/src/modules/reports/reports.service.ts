import prisma from '../../lib/prisma';
import ExcelJS from 'exceljs';
import { formatDateShort } from '../../lib/helpers';
import { exportPaymentsPdf, exportIncomePdf } from '../../lib/pdf';
export { exportPaymentsPdf };

export async function getIncomeReport(userId: string, from: Date, to: Date, propertyId?: string) {
  const payments = await prisma.payment.findMany({
    where: {
      status: 'PAID',
      paidDate: { gte: from, lte: to },
      contract: {
        property: { userId, ...(propertyId ? { id: propertyId } : {}) },
      },
    },
    include: { contract: { include: { property: true, tenants: true } } },
    orderBy: { paidDate: 'asc' },
  });

  const byProperty: Record<string, { name: string; tenant: string; amount: number }> = {};
  const byMonth: Record<string, number> = {};

  for (const p of payments) {
    const name = p.contract.property.name ?? p.contract.property.address;
    if (!byProperty[name]) byProperty[name] = { name, tenant: p.contract.tenants.map((t) => t.name).join(', ') || '—', amount: 0 };
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
  summarySheet.addRow([`Período: ${formatDateShort(from)} — ${formatDateShort(to)}`]);
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
      p.contract.tenants.map((t) => t.name).join(', ') || '—',
      p.period,
      p.amount,
      formatDateShort(p.paidDate),
      p.method ?? '—',
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}





export async function exportIncomeCsv(userId: string, from: Date, to: Date, propertyId?: string): Promise<Buffer> {
  const { payments, summary } = await getIncomeReport(userId, from, to, propertyId);

  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const rows: string[] = [];
  rows.push(['Propiedad', 'Inquilino', 'Período', 'Monto', 'Fecha de pago', 'Método'].map(esc).join(','));
  for (const p of payments) {
    rows.push([
      p.contract.property.name ?? p.contract.property.address,
      p.contract.tenants.map((t) => t.name).join(', ') || '—',
      p.period,
      p.amount,
      formatDateShort(p.paidDate),
      p.method ?? '—',
    ].map(esc).join(','));
  }
  rows.push('');
  rows.push('Resumen');
  rows.push(['Ingreso bruto', summary.total_gross].map(esc).join(','));
  rows.push(['Fee (1%)', summary.total_fee].map(esc).join(','));
  rows.push(['Ingreso neto', summary.total_net].map(esc).join(','));

  // BOM para que Excel/Sheets reconozca UTF-8 (acentos).
  return Buffer.from('﻿' + rows.join('\r\n'), 'utf8');
}

export type IncomeExportFormat = 'CSV' | 'XLSX' | 'PDF';

/** Genera el reporte de ingresos en el formato pedido y devuelve buffer + metadata. */
export async function generateIncomeExport(
  userId: string,
  format: IncomeExportFormat,
  from: Date,
  to: Date,
  propertyId?: string
): Promise<{ buffer: Buffer; ext: string; contentType: string }> {
  if (format === 'PDF') {
    const report = await getIncomeReport(userId, from, to, propertyId);
    return { buffer: await exportIncomePdf(report, from, to), ext: 'pdf', contentType: 'application/pdf' };
  }
  if (format === 'CSV') {
    return { buffer: await exportIncomeCsv(userId, from, to, propertyId), ext: 'csv', contentType: 'text/csv; charset=utf-8' };
  }
  return {
    buffer: await exportIncomeXlsx(userId, from, to, propertyId),
    ext: 'xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}
