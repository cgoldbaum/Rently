import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { UPLOAD_URL_PREFIX } from '../../lib/multer';
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

export async function resolveClaimController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const photoUrl = req.file
      ? `${UPLOAD_URL_PREFIX}/${req.file.filename}`
      : undefined;

    const claim = await claimsService.resolveClaim(
      req.params.id as string,
      req.user!.userId,
      { comment: req.body.comment, photoUrl }
    );
    res.json({ data: claim });
  } catch (err) {
    next(err);
  }
}
