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

router.get('/income', authenticate, getIncomeReportController as any);
router.get('/income/export', authenticate, exportIncomeController as any);
router.get('/payments/export', authenticate, exportPaymentsController as any);
router.get('/performance', authenticate, getPerformanceController as any);

// Reportes programados (envío automático por email)
router.get('/schedules', authenticate, listController as any);
router.post('/schedules', authenticate, createController as any);
router.patch('/schedules/:id', authenticate, updateController as any);
router.delete('/schedules/:id', authenticate, deleteController as any);
router.post('/schedules/:id/run', authenticate, runNowController as any);

export default router;
