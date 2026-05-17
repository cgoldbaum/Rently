import { Request, Response, NextFunction } from 'express';
import * as service from './portal-listings.service';

export async function listPortalListingsController(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.listPortalListings(String(req.params['id']));
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function publishToPortalController(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.publishToPortal(String(req.params['id']), String(req.body?.portal));
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function unpublishFromPortalController(req: Request, res: Response, next: NextFunction) {
  try {
    await service.unpublishFromPortal(String(req.params['id']), String(req.params['portal']));
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
}
