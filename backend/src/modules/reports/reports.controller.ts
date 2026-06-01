import { Request, Response, NextFunction } from 'express';
import * as service from './reports.service';
import { getPerformanceReport } from './performance.service';

export async function exportPaymentsController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.userId;
    const buffer = await service.exportPaymentsPdf(userId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-cobros.pdf"');
    res.send(buffer);
  } catch (err) { next(err); }
}

function parseDateParam(val: unknown, fallback: Date): Date {
  if (typeof val === 'string' && val) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return fallback;
}

export async function getIncomeReportController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.userId;
    const now = new Date();
    const from = parseDateParam(req.query.from, new Date(now.getFullYear(), now.getMonth() - 5, 1));
    const to = parseDateParam(req.query.to, now);
    const propertyId = req.query.property_id as string | undefined;
    const result = await service.getIncomeReport(userId, from, to, propertyId);
    res.json({ data: result });
  } catch (err) { next(err); }
}

export async function getPerformanceController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.userId;
    const data = await getPerformanceReport(userId);
    res.json({ data });
  } catch (err) { next(err); }
}

export async function exportIncomeController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.userId;
    const now = new Date();
    const from = parseDateParam(req.query.from, new Date(now.getFullYear(), now.getMonth() - 5, 1));
    const to = parseDateParam(req.query.to, now);
    const fmtRaw = String(req.query.format || 'xlsx').toUpperCase();
    const format: service.IncomeExportFormat =
      fmtRaw === 'PDF' || fmtRaw === 'CSV' ? fmtRaw : 'XLSX';
    const propertyId = req.query.property_id as string | undefined;

    const { buffer, ext, contentType } = await service.generateIncomeExport(userId, format, from, to, propertyId);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="reporte-ingresos.${ext}"`);
    res.send(buffer);
  } catch (err) { next(err); }
}
