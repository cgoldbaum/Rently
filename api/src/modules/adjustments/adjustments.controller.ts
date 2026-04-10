import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as service from './adjustments.service';

export async function listAdjustmentsByOwnerController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const adjustments = await service.listAdjustmentsByOwner(req.user!.userId);
    res.json({ data: adjustments });
  } catch (err) {
    next(err);
  }
}

export async function listAdjustmentsByContractController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const adjustments = await service.listAdjustmentsByContract(req.params.contractId);
    res.json({ data: adjustments });
  } catch (err) {
    next(err);
  }
}

export async function createAdjustmentController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const adjustment = await service.createAdjustment(req.params.contractId, req.user!.userId, req.body);
    res.status(201).json({ data: adjustment });
  } catch (err) {
    next(err);
  }
}
