import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import {
  getConversationsController,
  getMessagesController,
  sendMessageController,
  markReadController,
} from './chat.controller';

const router = Router();

router.use(authenticate);

router.get('/conversations', getConversationsController);
router.get('/conversations/:contractId/messages', getMessagesController);
router.post('/conversations/:contractId/messages', sendMessageController);
router.put('/conversations/:contractId/read', markReadController);

export default router;
