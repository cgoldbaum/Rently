import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { listNotesController, addNoteController } from './claim-notes.controller';

const router = Router({ mergeParams: true });

router.get('/', authenticate, listNotesController);
router.post('/', authenticate, addNoteController);

export default router;
