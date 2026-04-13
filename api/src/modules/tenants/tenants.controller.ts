import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as tenantsService from './tenants.service';

export async function createTenantController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenant = await tenantsService.createTenant(req.params.contractId as string, req.body);
    res.status(201).json({ data: tenant });
  } catch (err) {
    next(err);
  }
}

export async function getTenantController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenant = await tenantsService.getTenant(req.params.contractId as string);
    res.json({ data: tenant });
  } catch (err) {
    next(err);
  }
}

export async function resendLinkController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await tenantsService.resendLink(req.params.contractId as string);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getPublicLinkController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const info = await tenantsService.getPublicLinkInfo(req.params.token as string);
    res.json({ data: info });
  } catch (err) {
    next(err);
  }
}

export async function getTenantPortalController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await tenantsService.getTenantPortalData(req.params.token as string);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function confirmCashPaymentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payment = await tenantsService.confirmCashPayment(
      req.params.token as string,
      req.params.paymentId as string,
    );
    res.json({ data: payment });
  } catch (err) {
    next(err);
  }
}
