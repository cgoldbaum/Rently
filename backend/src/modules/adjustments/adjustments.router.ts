import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validateBody } from '../../middleware/validateBody';
import { createAdjustmentSchema } from './adjustments.schema';
import {
  listAdjustmentsByOwnerController,
  listAdjustmentsByContractController,
  createAdjustmentController,
  getCurrentIndexController,
} from './adjustments.controller';

const router = Router();

router.get('/', authenticate, listAdjustmentsByOwnerController);
router.get('/current-index', authenticate, getCurrentIndexController);

export default router;

export const contractAdjustmentsRouter = Router({ mergeParams: true });
contractAdjustmentsRouter.get('/', authenticate, listAdjustmentsByContractController);
contractAdjustmentsRouter.post('/', authenticate, validateBody(createAdjustmentSchema), createAdjustmentController);
