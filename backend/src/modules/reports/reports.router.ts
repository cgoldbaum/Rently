import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { getIncomeReportController, exportIncomeController, exportPaymentsController, getPerformanceController } from './reports.controller';
import {
  listController,
  createController,
  updateController,
  deleteController,
  runNowController,
} from '../scheduled-reports/scheduled-reports.controller';

const router = Router();

router.get('/income', authenticate, getIncomeReportController);
router.get('/income/export', authenticate, exportIncomeController);
router.get('/payments/export', authenticate, exportPaymentsController);
router.get('/performance', authenticate, getPerformanceController);

// Reportes programados (envío automático por email)
router.get('/schedules', authenticate, listController);
router.post('/schedules', authenticate, createController);
router.patch('/schedules/:id', authenticate, updateController);
router.delete('/schedules/:id', authenticate, deleteController);
router.post('/schedules/:id/run', authenticate, runNowController);

export default router;
