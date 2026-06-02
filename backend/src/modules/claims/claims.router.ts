import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validateBody } from '../../middleware/validateBody';
import { uploadImages } from '../../lib/multer';
import { createClaimSchema, resolveClaimSchema } from './claims.schema';
import {
  createPublicClaimController,
  listClaimsByOwnerController,
  markClaimInProgressController,
  resolveClaimController,
} from './claims.controller';

const router = Router();

router.post('/public/claims/:linkToken', validateBody(createClaimSchema), createPublicClaimController);
router.get('/', authenticate, listClaimsByOwnerController);
router.patch('/:id/in-progress', authenticate, markClaimInProgressController);
router.patch('/:id/resolve', authenticate, uploadImages.single('photo'), resolveClaimController);

export default router;
