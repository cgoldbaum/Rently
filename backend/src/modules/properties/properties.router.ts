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
  exportDescriptionController,
} from './properties.controller';

const router = Router();

router.post('/', authenticate, validateBody(createPropertySchema), createPropertyController);
router.get('/', authenticate, listPropertiesController);
router.get('/:id', authenticate, ownsProperty, getPropertyController);
router.patch('/:id', authenticate, ownsProperty, validateBody(updatePropertySchema), updatePropertyController);
router.get('/:id/export-description', authenticate, ownsProperty, exportDescriptionController);

export default router;
