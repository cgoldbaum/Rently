import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validateBody } from '../../middleware/validateBody';
import { subscriptionCheckoutSchema } from './subscriptions.schema';
import {
  cancelSubscriptionController,
  changePlanController,
  createCheckoutController,
  getSubscriptionController,
  listPlansController,
} from './subscriptions.controller';

const router = Router();

router.get('/plans', authenticate, listPlansController as any);
router.get('/', authenticate, getSubscriptionController as any);
router.post('/checkout', authenticate, validateBody(subscriptionCheckoutSchema), createCheckoutController as any);
router.post('/change-plan', authenticate, validateBody(subscriptionCheckoutSchema), changePlanController as any);
router.post('/cancel', authenticate, cancelSubscriptionController as any);

export default router;
