import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { getIncomeReportController, exportIncomeController, exportPaymentsController, getPerformanceController } from './reports.controller';

const router = Router();

router.get('/income', authenticate, getIncomeReportController as any);
router.get('/income/export', authenticate, exportIncomeController as any);
router.get('/payments/export', authenticate, exportPaymentsController as any);
router.get('/performance', authenticate, getPerformanceController as any);

export default router;
