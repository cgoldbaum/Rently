import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validateBody } from '../../middleware/validateBody';
import { createAdjustmentSchema } from './adjustments.schema';
import {
  listAdjustmentsByOwnerController,
  listAdjustmentsByContractController,
  createAdjustmentController,
} from './adjustments.controller';

const router = Router();

router.get('/', authenticate, listAdjustmentsByOwnerController as any);

export default router;

export const contractAdjustmentsRouter = Router({ mergeParams: true });
contractAdjustmentsRouter.get('/', authenticate, listAdjustmentsByContractController as any);
contractAdjustmentsRouter.post('/', authenticate, validateBody(createAdjustmentSchema), createAdjustmentController as any);
