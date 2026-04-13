import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as service from './adjustments.service';

function asSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

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
    const adjustments = await service.listAdjustmentsByContract(asSingleParam(req.params.contractId));
    res.json({ data: adjustments });
  } catch (err) {
    next(err);
  }
}

export async function createAdjustmentController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const adjustment = await service.createAdjustment(asSingleParam(req.params.contractId), req.user!.userId, req.body);
    res.status(201).json({ data: adjustment });
  } catch (err) {
    next(err);
  }
}
