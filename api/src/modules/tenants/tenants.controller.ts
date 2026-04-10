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
