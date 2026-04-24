import { Router } from 'express';
import { mercadoPagoWebhookController } from './webhooks.controller';

const router = Router();
router.post('/mercadopago', mercadoPagoWebhookController as any);

export default router;
