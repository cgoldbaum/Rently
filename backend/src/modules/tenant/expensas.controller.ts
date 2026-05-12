import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as expensasService from './expensas.service';

export async function getExpenseReceiptsController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await expensasService.getExpenseReceipts(req.user!.tenantId!);
    res.json({ data });
  } catch (err) { next(err); }
}

export async function uploadExpenseReceiptController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { period } = req.body as { period?: string };
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      res.status(400).json({ error: 'El campo period es requerido (formato YYYY-MM)' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'No se recibió ningún archivo' });
      return;
    }
    const data = await expensasService.uploadExpenseReceipt(req.user!.tenantId!, period, req.file);
    res.status(201).json({ data });
  } catch (err) { next(err); }
}

export async function deleteExpenseReceiptController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await expensasService.deleteExpenseReceipt(req.user!.tenantId!, String(req.params['id']));
    res.status(204).send();
  } catch (err) { next(err); }
}
