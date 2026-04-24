import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { listNotesController, addNoteController } from './claim-notes.controller';

const router = Router({ mergeParams: true });

router.get('/', authenticate, listNotesController as any);
router.post('/', authenticate, addNoteController as any);

export default router;
