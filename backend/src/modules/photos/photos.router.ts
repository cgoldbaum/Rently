import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { uploadImages } from '../../lib/multer';
import {
  listPhotosController,
  addPhotosController,
  updatePhotoController,
  deletePhotoController,
} from './photos.controller';

const router = Router({ mergeParams: true });

router.get('/', authenticate, listPhotosController);
router.post('/', authenticate, uploadImages.array('images[]', 20), addPhotosController);
router.patch('/:photoId', authenticate, updatePhotoController);
router.delete('/:photoId', authenticate, deletePhotoController);

export default router;
