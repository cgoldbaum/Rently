import prisma from '../../lib/prisma';
import ExcelJS from 'exceljs';
import { formatDateShort, periodKey } from '../../lib/helpers';
import { exportPaymentsPdf, exportIncomePdf } from '../../lib/pdf';
export { exportPaymentsPdf };

export type CurrencyReport = {
  summary: { total_gross: number; total_fee: number; total_net: number };
  by_property: { name: string; tenant: string; amount: number }[];
  by_month: { month: string; amount: number }[];
};

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

  // Todo se agrupa por moneda: sumar ARS + USD en un mismo total no tiene sentido
  // contable. `reports[currency]` da un sub-reporte coherente por cada moneda presente.
  const byPropertyByCur: Record<string, Record<string, { name: string; tenant: string; amount: number }>> = {};
  const byMonthByCur: Record<string, Record<string, number>> = {};
  const grossByCur: Record<string, number> = {};

  for (const p of payments) {
    const cur = p.currency;
    const name = p.contract.property.name ?? p.contract.property.address;

    (byPropertyByCur[cur] ??= {});
    if (!byPropertyByCur[cur][name]) {
      byPropertyByCur[cur][name] = { name, tenant: p.contract.tenants.map((t) => t.name).join(', ') || '—', amount: 0 };
    }
    byPropertyByCur[cur][name].amount += p.amount;

    const monthKey = periodKey(p.paidDate!);
    (byMonthByCur[cur] ??= {});
    byMonthByCur[cur][monthKey] = (byMonthByCur[cur][monthKey] ?? 0) + p.amount;

    grossByCur[cur] = (grossByCur[cur] ?? 0) + p.amount;
  }

  const currencies = Object.keys(grossByCur).sort();
  const reports: Record<string, CurrencyReport> = {};
  for (const cur of currencies) {
    const gross = grossByCur[cur];
    const fee = Math.round(gross * 0.01);
    reports[cur] = {
      summary: { total_gross: gross, total_fee: fee, total_net: gross - fee },
      by_property: Object.values(byPropertyByCur[cur]),
      by_month: Object.entries(byMonthByCur[cur])
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    };
  }

  return { currencies, reports, payments };
}

export async function exportIncomeXlsx(userId: string, from: Date, to: Date, propertyId?: string): Promise<Buffer> {
  const { currencies, reports, payments } = await getIncomeReport(userId, from, to, propertyId);

  const workbook = new ExcelJS.Workbook();

  const summarySheet = workbook.addWorksheet('Resumen');
  summarySheet.addRow(['Reporte de Ingresos — Rently']);
  summarySheet.addRow([`Período: ${formatDateShort(from)} — ${formatDateShort(to)}`]);
  if (currencies.length === 0) {
    summarySheet.addRow([]);
    summarySheet.addRow(['Sin cobros en el período']);
  }
  for (const cur of currencies) {
    const r = reports[cur];
    summarySheet.addRow([]);
    summarySheet.addRow([`Moneda: ${cur}`]);
    summarySheet.addRow(['Ingreso bruto', r.summary.total_gross]);
    summarySheet.addRow(['Fee (1%)', r.summary.total_fee]);
    summarySheet.addRow(['Ingreso neto', r.summary.total_net]);
    summarySheet.addRow([]);
    summarySheet.addRow(['Por propiedad', '', '']);
    summarySheet.addRow(['Propiedad', 'Inquilino', 'Total']);
    for (const row of r.by_property) summarySheet.addRow([row.name, row.tenant, row.amount]);
    summarySheet.addRow([]);
    summarySheet.addRow(['Por mes', '']);
    summarySheet.addRow(['Mes', 'Total']);
    for (const m of r.by_month) summarySheet.addRow([m.month, m.amount]);
  }

  const detailSheet = workbook.addWorksheet('Detalle');
  detailSheet.addRow(['Propiedad', 'Inquilino', 'Período', 'Moneda', 'Monto', 'Fecha de pago', 'Método']);
  for (const p of payments) {
    detailSheet.addRow([
      p.contract.property.name ?? p.contract.property.address,
      p.contract.tenants.map((t) => t.name).join(', ') || '—',
      p.period,
      p.currency,
      p.amount,
      formatDateShort(p.paidDate),
      p.method ?? '—',
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}





export async function exportIncomeCsv(userId: string, from: Date, to: Date, propertyId?: string): Promise<Buffer> {
  const { currencies, reports, payments } = await getIncomeReport(userId, from, to, propertyId);

  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const rows: string[] = [];
  rows.push(['Propiedad', 'Inquilino', 'Período', 'Moneda', 'Monto', 'Fecha de pago', 'Método'].map(esc).join(','));
  for (const p of payments) {
    rows.push([
      p.contract.property.name ?? p.contract.property.address,
      p.contract.tenants.map((t) => t.name).join(', ') || '—',
      p.period,
      p.currency,
      p.amount,
      formatDateShort(p.paidDate),
      p.method ?? '—',
    ].map(esc).join(','));
  }
  rows.push('');
  rows.push('Resumen');
  for (const cur of currencies) {
    const r = reports[cur];
    rows.push('');
    rows.push([`Moneda: ${cur}`].map(esc).join(','));
    rows.push(['Ingreso bruto', r.summary.total_gross].map(esc).join(','));
    rows.push(['Fee (1%)', r.summary.total_fee].map(esc).join(','));
    rows.push(['Ingreso neto', r.summary.total_net].map(esc).join(','));
  }

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
