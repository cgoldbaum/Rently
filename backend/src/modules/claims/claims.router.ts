import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validateBody } from '../../middleware/validateBody';
import { createClaimSchema, updateClaimSchema } from './claims.schema';
import {
  createPublicClaimController,
  listClaimsByOwnerController,
  updateClaimController,
} from './claims.controller';

const router = Router();

router.post('/public/claims/:linkToken', validateBody(createClaimSchema), createPublicClaimController);
router.get('/', authenticate, listClaimsByOwnerController);
router.patch('/:id', authenticate, validateBody(updateClaimSchema), updateClaimController);

export default router;
