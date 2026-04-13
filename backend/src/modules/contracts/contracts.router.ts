import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { ownsProperty } from '../../middleware/ownsProperty';
import { validateBody } from '../../middleware/validateBody';
import { createContractSchema, updateContractSchema } from './contracts.schema';
import {
  createContractController,
  getContractController,
  updateContractController,
} from './contracts.controller';

const router = Router({ mergeParams: true });

router.post('/', authenticate, ownsProperty, validateBody(createContractSchema), createContractController);
router.get('/', authenticate, ownsProperty, getContractController);
router.patch('/', authenticate, ownsProperty, validateBody(updateContractSchema), updateContractController);

export default router;
