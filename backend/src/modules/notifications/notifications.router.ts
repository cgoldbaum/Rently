import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { listNotificationsController, markReadController, markUnreadController, markAllReadController } from './notifications.controller';

const router = Router();

router.get('/', authenticate, listNotificationsController as any);
router.put('/read-all', authenticate, markAllReadController as any);
router.put('/:id/read', authenticate, markReadController as any);
router.put('/:id/unread', authenticate, markUnreadController as any);

export default router;
