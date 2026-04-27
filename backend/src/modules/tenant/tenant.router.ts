import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireTenant } from '../../middleware/requireTenant';
import {
  getContractController,
  getPaymentsController,
  registerCashPaymentController,
  createMercadoPagoPaymentController,
  getUpcomingPaymentsController,
  getPaymentReceiptController,
  getClaimsController,
  getClaimController,
  createClaimController,
  updateClaimDescriptionController,
  deleteClaimController,
  getNotificationsController,
  markNotificationReadController,
  markAllNotificationsReadController,
  getPropertyPhotosController,
} from './tenant.controller';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

// Contract
router.get('/contract', getContractController);

// Payments (order matters: /upcoming and /cash before /:id)
router.get('/payments', getPaymentsController);
router.post('/payments/cash', registerCashPaymentController);
router.get('/payments/upcoming', getUpcomingPaymentsController);
router.post('/payments/:id/mercadopago', createMercadoPagoPaymentController);
router.get('/payments/:id/receipt', getPaymentReceiptController);

// Claims
router.get('/claims', getClaimsController);
router.post('/claims', createClaimController);
router.get('/claims/:id', getClaimController);
router.patch('/claims/:id', updateClaimDescriptionController);
router.delete('/claims/:id', deleteClaimController);

// Photos
router.get('/photos', getPropertyPhotosController);

// Notifications
router.get('/notifications', getNotificationsController);
router.put('/notifications/read-all', markAllNotificationsReadController);
router.put('/notifications/:id/read', markNotificationReadController);

export default router;
