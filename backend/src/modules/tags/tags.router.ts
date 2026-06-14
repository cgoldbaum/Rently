import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import {
  listTagsController,
  createTagController,
  updateTagController,
  deleteTagController,
} from './tags.controller';

const router = Router();

router.get('/', authenticate, listTagsController);
router.post('/', authenticate, createTagController);
router.patch('/:tagId', authenticate, updateTagController);
router.delete('/:tagId', authenticate, deleteTagController);

export default router;
