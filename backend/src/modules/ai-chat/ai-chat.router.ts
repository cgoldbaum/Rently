import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import {
  listSessionsController,
  createSessionController,
  getSessionController,
  getOrCreateContractSessionController,
  deleteSessionController,
  sendMessageController,
} from './ai-chat.controller';

const router = Router();

router.use(authenticate);

router.get('/sessions', listSessionsController);
router.post('/sessions', createSessionController);
router.get('/sessions/:sessionId', getSessionController);
router.delete('/sessions/:sessionId', deleteSessionController);
router.post('/sessions/:sessionId/messages', sendMessageController);
router.get('/contract/:contractId/session', getOrCreateContractSessionController);

export default router;
