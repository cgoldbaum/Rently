import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { listNotificationsController, markReadController, markUnreadController, markAllReadController } from './notifications.controller';

const router = Router();

router.get('/', authenticate, listNotificationsController);
router.put('/read-all', authenticate, markAllReadController);
router.put('/:id/read', authenticate, markReadController);
router.put('/:id/unread', authenticate, markUnreadController);

export default router;
