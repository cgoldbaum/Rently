import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import {
  listInspectionsController,
  createInspectionController,
  updateInspectionController,
  deleteInspectionController,
  splitPaymentController,
} from './inspections.controller';

const router = Router();

router.use(authenticate);

router.get('/', listInspectionsController);
router.post('/', createInspectionController);
router.patch('/:id', updateInspectionController);
router.delete('/:id', deleteInspectionController);

export const paymentInstallmentsRouter = Router();
paymentInstallmentsRouter.use(authenticate);
paymentInstallmentsRouter.post('/:id/split', splitPaymentController);

export default router;
