import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { getDashboardController } from './dashboard.controller';

const router = Router();

router.get('/', authenticate, getDashboardController);

export default router;
