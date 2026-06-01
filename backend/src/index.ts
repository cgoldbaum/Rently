import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

import authRouter from './modules/auth/auth.router';
import webAuthnRouter from './modules/webauthn/webauthn.router';
import propertiesRouter from './modules/properties/properties.router';
import contractsRouter from './modules/contracts/contracts.router';
import tenantsRouter from './modules/tenants/tenants.router';
import dashboardRouter from './modules/dashboard/dashboard.router';
import paymentsRouter, { contractPaymentsRouter } from './modules/payments/payments.router';
import adjustmentsRouter, { contractAdjustmentsRouter } from './modules/adjustments/adjustments.router';
import tenantRouter from './modules/tenant/tenant.router';
import notificationsRouter from './modules/notifications/notifications.router';
import claimNotesRouter from './modules/claim-notes/claim-notes.router';
import photosRouter from './modules/photos/photos.router';
import contractDocumentsRouter from './modules/contract-documents/contract-documents.router';
import paymentLinksRouter from './modules/payment-links/payment-links.router';
import {
  confirmPublicMockPaymentController,
  getPublicMockPaymentLinkController,
} from './modules/payment-links/payment-links.controller';
import webhooksRouter from './modules/webhooks/webhooks.router';
import chatRouter from './modules/chat/chat.router';
import aiChatRouter from './modules/ai-chat/ai-chat.router';
import reportsRouter from './modules/reports/reports.router';
import inspectionsRouter, { paymentInstallmentsRouter } from './modules/inspections/inspections.router';
import subscriptionsRouter from './modules/subscriptions/subscriptions.router';
import {
  confirmPublicMockSubscriptionController,
  getPublicMockSubscriptionController,
} from './modules/subscriptions/subscriptions.controller';
import { authenticate } from './middleware/authenticate';
import { ownsProperty } from './middleware/ownsProperty';
import { validateBody } from './middleware/validateBody';
import { createClaimSchema } from './modules/claims/claims.schema';
import {
  createPublicClaimController,
  listClaimsByOwnerController,
  resolveClaimController,
} from './modules/claims/claims.controller';
import { uploadImages } from './lib/multer';
import { getPublicLinkController, getTenantPortalController, confirmCashPaymentController } from './modules/tenants/tenants.controller';
import {
  confirmPublicMockTenantPaymentController,
  getPublicMockTenantPaymentController,
} from './modules/tenant/tenant.controller';
import { errorHandler } from './middleware/errorHandler';
import { startAdjustmentAlertJob } from './jobs/adjustmentAlerts';
import { startAutoAdjustmentJob } from './jobs/autoAdjustment';
import { startContractRenewalAlertJob, triggerRenewalAlertsForUser } from './jobs/contractRenewalAlerts';
import { startScheduledReportsJob } from './jobs/scheduledReports';
import { startSubscriptionExpirationJob } from './jobs/subscriptionExpiration';

const app = express();

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://localhost:3001'];
const configuredAllowedOrigins = (process.env.APP_URLS || process.env.APP_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = Array.from(
  new Set([
    ...(process.env.NODE_ENV === 'production' ? [] : DEFAULT_ALLOWED_ORIGINS),
    ...configuredAllowedOrigins,
  ])
);

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(UPLOAD_DIR));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Auth
app.use('/auth', authRouter);

// WebAuthn
app.use('/auth/webauthn', webAuthnRouter);

// Dashboard
app.use('/dashboard', dashboardRouter);

// Properties
app.use('/properties', propertiesRouter);

// Photos (nested under properties)
app.use('/properties/:id/photos', photosRouter);

// Payment links (nested under properties)
app.use('/properties/:id/payment-links', paymentLinksRouter);

// Contracts (nested under properties)
app.use('/properties/:id/contract', contractsRouter);

// Contract documents
app.use('/contracts/:contractId/document', contractDocumentsRouter);

// Claims on a property
app.get('/properties/:id/claims', authenticate, ownsProperty, listClaimsByOwnerController as express.RequestHandler);

// Tenants (nested under contracts)
app.use('/contracts/:contractId/tenant', tenantsRouter);

// Payments
app.use('/payments', paymentsRouter);
app.use('/contracts/:contractId/payments', contractPaymentsRouter);

// Adjustments
app.use('/adjustments', adjustmentsRouter);
app.use('/contracts/:contractId/adjustments', contractAdjustmentsRouter);

// Tenant authenticated routes
app.use('/tenant', tenantRouter);

// Owner notifications
app.use('/owner/notifications', notificationsRouter);

// Owner reports
app.use('/owner/reports', reportsRouter);

// Inspections & visits
app.use('/inspections', inspectionsRouter);

// Payment installments
app.use('/payments', paymentInstallmentsRouter);

// Owner subscriptions
app.use('/owner/subscription', subscriptionsRouter);

// Claim notes
app.use('/claims/:id/notes', claimNotesRouter);

// Chat (owner ↔ tenant)
app.use('/chat', chatRouter);

// AI Chat
app.use('/ai-chat', aiChatRouter);

// Webhooks (public)
app.use('/webhooks', webhooksRouter);

// Public routes
app.post('/public/claims/:linkToken', validateBody(createClaimSchema), createPublicClaimController);
app.get('/public/link/:token', getPublicLinkController);
app.get('/public/portal/:token', getTenantPortalController);
app.post('/public/portal/:token/payments/:paymentId/cash', confirmCashPaymentController);
app.get('/public/payment-links/:preferenceId', getPublicMockPaymentLinkController);
app.post('/public/payment-links/:preferenceId/mock-pay', confirmPublicMockPaymentController);
app.get('/public/tenant-payments/:id', getPublicMockTenantPaymentController);
app.post('/public/tenant-payments/:id/mock-pay', confirmPublicMockTenantPaymentController);
app.get('/public/subscriptions/:subscriptionId', getPublicMockSubscriptionController);
app.post('/public/subscriptions/:subscriptionId/mock-pay', confirmPublicMockSubscriptionController);

// Claims (owner)
app.get('/claims', authenticate, listClaimsByOwnerController as express.RequestHandler);
app.patch('/claims/:id/resolve', authenticate, uploadImages.single('photo'), resolveClaimController as express.RequestHandler);

// Dev: trigger renewal alert for current user
app.post('/owner/notifications/test-renewal', authenticate, async (req: express.Request, res: express.Response) => {
  const userId = (req as any).user.userId;
  const sent = await triggerRenewalAlertsForUser(userId);
  res.json({ ok: true, sent });
});

// Global error handler
app.use(errorHandler as express.ErrorRequestHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Rently API running on http://localhost:${PORT}`);
  startAdjustmentAlertJob();
  startAutoAdjustmentJob();
  startContractRenewalAlertJob();
  startScheduledReportsJob();
  startSubscriptionExpirationJob();
});

export default app;
