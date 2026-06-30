import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { createPaymentLinkController, listPaymentLinksController } from './payment-links.controller';

const router = Router({ mergeParams: true });

router.get('/', authenticate, listPaymentLinksController);
router.post('/', authenticate, createPaymentLinkController);

export default router;
