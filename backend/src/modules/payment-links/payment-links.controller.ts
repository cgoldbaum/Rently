import { Request, Response, NextFunction } from 'express';
import * as service from './payment-links.service';

export async function createPaymentLinkController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.userId;
    const { amount, period, description } = req.body;
    if (!amount || !period) return res.status(400).json({ error: { message: 'amount y period son requeridos' } });
    const result = await service.createPaymentLink(req.params.id as string, userId, { amount: Number(amount), period, description });
    res.status(201).json({ data: result });
  } catch (err) { next(err); }
}

export async function listPaymentLinksController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.userId;
    const links = await service.listPaymentLinks(req.params.id as string, userId);
    res.json({ data: links });
  } catch (err) { next(err); }
}
