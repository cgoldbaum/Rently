import { Request, Response, NextFunction } from 'express';
import { handleMercadoPagoWebhook } from './webhooks.service';

export async function mercadoPagoWebhookController(req: Request, res: Response, next: NextFunction) {
  res.sendStatus(200);
  try {
    await handleMercadoPagoWebhook(req.body ?? {});
  } catch (err) {
    console.error('[MP Webhook error]', err);
  }
}
