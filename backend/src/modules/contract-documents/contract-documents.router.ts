import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { uploadPdf } from '../../lib/multer';
import { getDocumentController, uploadDocumentController } from './contract-documents.controller';

const router = Router({ mergeParams: true });

router.get('/', authenticate, getDocumentController);
router.post('/', authenticate, uploadPdf.single('file'), uploadDocumentController);

export default router;
