import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { ownsProperty } from '../../middleware/ownsProperty';
import {
  listFoldersController,
  createFolderController,
  updateFolderController,
  deleteFolderController,
} from './folders.controller';

const router = Router({ mergeParams: true });

router.get('/', authenticate, ownsProperty, listFoldersController as any);
router.post('/', authenticate, ownsProperty, createFolderController as any);
router.patch('/:folderId', authenticate, ownsProperty, updateFolderController as any);
router.delete('/:folderId', authenticate, ownsProperty, deleteFolderController as any);

export default router;
