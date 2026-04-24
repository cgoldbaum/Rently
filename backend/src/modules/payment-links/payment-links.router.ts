import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { createPaymentLinkController, listPaymentLinksController } from './payment-links.controller';

const router = Router({ mergeParams: true });

router.get('/', authenticate, listPaymentLinksController as any);
router.post('/', authenticate, createPaymentLinkController as any);

export default router;
