import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validateBody } from '../../middleware/validateBody';
import { createPaymentSchema, updatePaymentSchema } from './payments.schema';
import {
  createPaymentController,
  listPaymentsByContractController,
  listPaymentsByOwnerController,
  updatePaymentController,
  getPaymentStatsController,
  getPaymentReceiptController,
} from './payments.controller';

const router = Router();

// Owner: list all payments across properties
router.get('/', authenticate, listPaymentsByOwnerController as any);
router.get('/stats', authenticate, getPaymentStatsController as any);
router.get('/:id/receipt', authenticate, getPaymentReceiptController as any);
router.patch('/:id', authenticate, validateBody(updatePaymentSchema), updatePaymentController as any);

export default router;

// Nested router for contract payments
export const contractPaymentsRouter = Router({ mergeParams: true });
contractPaymentsRouter.post('/', authenticate, validateBody(createPaymentSchema), createPaymentController as any);
contractPaymentsRouter.get('/', authenticate, listPaymentsByContractController as any);
