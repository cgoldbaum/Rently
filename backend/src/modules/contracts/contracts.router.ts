import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { ownsProperty } from '../../middleware/ownsProperty';
import { validateBody } from '../../middleware/validateBody';
import { uploadContractImport } from '../../lib/multer';
import { createContractSchema, updateContractSchema } from './contracts.schema';
import {
  createContractController,
  getContractController,
  importContractPreviewController,
  updateContractController,
} from './contracts.controller';

const router = Router({ mergeParams: true });

router.post('/import-preview', authenticate, ownsProperty, uploadContractImport.single('file'), importContractPreviewController);
router.post('/', authenticate, ownsProperty, validateBody(createContractSchema), createContractController);
router.get('/', authenticate, ownsProperty, getContractController);
router.patch('/', authenticate, ownsProperty, validateBody(updateContractSchema), updateContractController);

export default router;
