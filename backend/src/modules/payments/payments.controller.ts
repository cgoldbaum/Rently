import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as service from './payments.service';

function asSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

export async function createPaymentController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const contractId = asSingleParam(req.params.contractId);
    const payment = await service.createPayment(contractId, req.body);
    res.status(201).json({ data: payment });
  } catch (err) {
    next(err);
  }
}

export async function listPaymentsByContractController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const payments = await service.listPaymentsByContract(asSingleParam(req.params.contractId));
    res.json({ data: payments });
  } catch (err) {
    next(err);
  }
}

export async function listPaymentsByOwnerController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const payments = await service.listPaymentsByOwner(req.user!.userId);
    res.json({ data: payments });
  } catch (err) {
    next(err);
  }
}

export async function updatePaymentController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const payment = await service.updatePayment(asSingleParam(req.params.id), req.user!.userId, req.body);
    res.json({ data: payment });
  } catch (err) {
    next(err);
  }
}

export async function getPaymentStatsController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const stats = await service.getPaymentStats(req.user!.userId);
    res.json({ data: stats });
  } catch (err) {
    next(err);
  }
}
