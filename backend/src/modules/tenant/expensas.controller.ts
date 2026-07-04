import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { AppError } from '../../lib/AppError';
import * as expensasService from './expensas.service';
import { previewExpenseReceiptImport } from './expensas.import.service';

function optionalText(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function parseAmount(value: unknown) {
  const raw = optionalText(value);
  if (!raw) return undefined;
  const amount = Number(raw.replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError('errors:expensas.invalidAmount', 400);
  }
  return amount;
}

function parseDueDate(value: unknown) {
  const raw = optionalText(value);
  if (!raw) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new AppError('errors:expensas.invalidDueDate', 400);
  }
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new AppError('errors:expensas.invalidDueDate', 400);
  }
  return date;
}

function parseCurrency(value: unknown): 'ARS' | 'USD' | undefined {
  const raw = optionalText(value);
  if (!raw) return undefined;
  if (raw !== 'ARS' && raw !== 'USD') {
    throw new AppError('errors:expensas.invalidCurrency', 400);
  }
  return raw;
}

function parseConfidence(value: unknown) {
  const raw = optionalText(value);
  if (!raw) return undefined;
  const confidence = Number(raw);
  if (!Number.isFinite(confidence)) return undefined;
  return Math.max(0, Math.min(100, Math.round(confidence)));
}

function parseReceiptInput(body: Record<string, unknown>) {
  const period = optionalText(body.period);
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    throw new AppError('errors:expensas.missingPeriod', 400);
  }

  return {
    period,
    amount: parseAmount(body.amount),
    currency: parseCurrency(body.currency),
    dueDate: parseDueDate(body.dueDate),
    issuer: optionalText(body.issuer),
    receiptNumber: optionalText(body.receiptNumber),
    notes: optionalText(body.notes),
    ocrConfidence: parseConfidence(body.ocrConfidence),
  };
}

export async function getExpenseReceiptsController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await expensasService.getExpenseReceipts(req.user!.tenantId!);
    res.json({ data });
  } catch (err) { next(err); }
}

export async function previewExpenseReceiptImportController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new AppError('errors:expensas.missingFile', 400);
    }
    const data = await previewExpenseReceiptImport(req.file);
    res.json({ data });
  } catch (err) { next(err); }
}

export async function uploadExpenseReceiptController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input = parseReceiptInput(req.body as Record<string, unknown>);
    if (!req.file) {
      throw new AppError('errors:expensas.missingFile', 400);
    }
    const data = await expensasService.uploadExpenseReceipt(req.user!.tenantId!, input, req.file);
    res.status(201).json({ data });
  } catch (err) { next(err); }
}

export async function deleteExpenseReceiptController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await expensasService.deleteExpenseReceipt(req.user!.tenantId!, String(req.params['id']));
    res.status(204).send();
  } catch (err) { next(err); }
}