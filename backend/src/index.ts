import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

import authRouter from './modules/auth/auth.router';
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
import webhooksRouter from './modules/webhooks/webhooks.router';
import reportsRouter from './modules/reports/reports.router';
import { authenticate } from './middleware/authenticate';
import { ownsProperty } from './middleware/ownsProperty';
import { validateBody } from './middleware/validateBody';
import { createClaimSchema, updateClaimSchema } from './modules/claims/claims.schema';
import {
  createPublicClaimController,
  listClaimsByOwnerController,
  listClaimsByPropertyController,
  updateClaimController,
} from './modules/claims/claims.controller';
import { getPublicLinkController, getTenantPortalController, confirmCashPaymentController } from './modules/tenants/tenants.controller';
import { errorHandler } from './middleware/errorHandler';
import { startAdjustmentAlertJob } from './jobs/adjustmentAlerts';

const app = express();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(UPLOAD_DIR));

app.use(cors({ origin: process.env.APP_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Auth
app.use('/auth', authRouter);

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
app.get('/properties/:id/claims', authenticate, ownsProperty, listClaimsByPropertyController as express.RequestHandler);

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

// Claim notes
app.use('/claims/:id/notes', claimNotesRouter);

// Webhooks (public)
app.use('/webhooks', webhooksRouter);

// Public routes
app.post('/public/claims/:linkToken', validateBody(createClaimSchema), createPublicClaimController);
app.get('/public/link/:token', getPublicLinkController);
app.get('/public/portal/:token', getTenantPortalController);
app.post('/public/portal/:token/payments/:paymentId/cash', confirmCashPaymentController);

// Claims (owner)
app.get('/claims', authenticate, listClaimsByOwnerController as express.RequestHandler);
app.patch('/claims/:id', authenticate, validateBody(updateClaimSchema), updateClaimController as express.RequestHandler);

// Global error handler
app.use(errorHandler as express.ErrorRequestHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Rently API running on http://localhost:${PORT}`);
  startAdjustmentAlertJob();
});

export default app;
