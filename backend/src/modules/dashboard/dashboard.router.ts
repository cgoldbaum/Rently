import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { getDashboardController, getNotificationsController } from './dashboard.controller';

const router = Router();

router.get('/', authenticate, getDashboardController);
router.get('/notifications', authenticate, getNotificationsController);

export default router;
