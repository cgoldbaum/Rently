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

router.get('/', authenticate, ownsProperty, listFoldersController);
router.post('/', authenticate, ownsProperty, createFolderController);
router.patch('/:folderId', authenticate, ownsProperty, updateFolderController);
router.delete('/:folderId', authenticate, ownsProperty, deleteFolderController);

export default router;
