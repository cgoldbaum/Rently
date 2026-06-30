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

router.get('/plans', authenticate, listPlansController);
router.get('/', authenticate, getSubscriptionController);
router.post('/checkout', authenticate, validateBody(subscriptionCheckoutSchema), createCheckoutController);
router.post('/change-plan', authenticate, validateBody(subscriptionCheckoutSchema), changePlanController);
router.post('/cancel', authenticate, cancelSubscriptionController);

export default router;
