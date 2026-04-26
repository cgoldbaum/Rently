import { Request, Response, NextFunction } from 'express';
import * as service from './reports.service';

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

export async function exportIncomeController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.userId;
    const now = new Date();
    const from = parseDateParam(req.query.from, new Date(now.getFullYear(), now.getMonth() - 5, 1));
    const to = parseDateParam(req.query.to, now);
    const format = req.query.format as string || 'xlsx';
    const propertyId = req.query.property_id as string | undefined;

    if (format === 'pdf') {
      const buffer = await service.exportIncomePdf(userId, from, to, propertyId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-ingresos.pdf"');
      res.send(buffer);
    } else {
      const buffer = await service.exportIncomeXlsx(userId, from, to, propertyId);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-ingresos.xlsx"');
      res.send(buffer);
    }
  } catch (err) { next(err); }
}
