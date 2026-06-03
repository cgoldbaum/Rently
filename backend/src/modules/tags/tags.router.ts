import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import {
  listTagsController,
  createTagController,
  updateTagController,
  deleteTagController,
} from './tags.controller';

const router = Router();

router.get('/', authenticate, listTagsController as any);
router.post('/', authenticate, createTagController as any);
router.patch('/:tagId', authenticate, updateTagController as any);
router.delete('/:tagId', authenticate, deleteTagController as any);

export default router;
