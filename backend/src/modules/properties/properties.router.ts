import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { ownsProperty } from '../../middleware/ownsProperty';
import { validateBody } from '../../middleware/validateBody';
import { createPropertySchema, updatePropertySchema } from './properties.schema';
import {
  createPropertyController,
  listPropertiesController,
  getPropertyController,
  updatePropertyController,
} from './properties.controller';

const router = Router();

router.post('/', authenticate, validateBody(createPropertySchema), createPropertyController);
router.get('/', authenticate, listPropertiesController);
router.get('/:id', authenticate, ownsProperty, getPropertyController);
router.patch('/:id', authenticate, ownsProperty, validateBody(updatePropertySchema), updatePropertyController);

export default router;
