import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validateBody } from '../../middleware/validateBody';
import { createTenantSchema } from './tenants.schema';
import {
  createTenantController,
  getTenantController,
  resendLinkController,
  getPublicLinkController,
} from './tenants.controller';

const router = Router({ mergeParams: true });

router.post('/', authenticate, validateBody(createTenantSchema), createTenantController);
router.get('/', authenticate, getTenantController);
router.post('/resend-link', authenticate, resendLinkController);
router.get('/public/link/:token', getPublicLinkController);

export default router;
