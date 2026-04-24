import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { getIncomeReportController, exportIncomeController } from './reports.controller';

const router = Router();

router.get('/income', authenticate, getIncomeReportController as any);
router.get('/income/export', authenticate, exportIncomeController as any);

export default router;
