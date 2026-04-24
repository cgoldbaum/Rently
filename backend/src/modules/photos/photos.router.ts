import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { uploadImages } from '../../lib/multer';
import { listPhotosController, addPhotosController, deletePhotoController } from './photos.controller';

const router = Router({ mergeParams: true });

router.get('/', authenticate, listPhotosController as any);
router.post('/', authenticate, uploadImages.array('images[]', 20), addPhotosController as any);
router.delete('/:photoId', authenticate, deletePhotoController as any);

export default router;
