import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as claimsService from './claims.service';

export async function createPublicClaimController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const claim = await claimsService.createPublicClaim(req.params.linkToken as string, req.body);
    res.status(201).json({ data: claim });
  } catch (err) {
    next(err);
  }
}

export async function listClaimsByOwnerController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const claims = await claimsService.listClaimsByOwner(req.user!.userId);
    res.json({ data: claims });
  } catch (err) {
    next(err);
  }
}

export async function listClaimsByPropertyController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const claims = await claimsService.listClaimsByProperty(req.params.id as string);
    res.json({ data: claims });
  } catch (err) {
    next(err);
  }
}

export async function updateClaimController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const claim = await claimsService.updateClaim(req.params.id as string, req.user!.userId, req.body);
    res.json({ data: claim });
  } catch (err) {
    next(err);
  }
}
