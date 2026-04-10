import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as service from './payments.service';

export async function createPaymentController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const contractId = req.params.contractId;
    const payment = await service.createPayment(contractId, req.body);
    res.status(201).json({ data: payment });
  } catch (err) {
    next(err);
  }
}

export async function listPaymentsByContractController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const payments = await service.listPaymentsByContract(req.params.contractId);
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
    const payment = await service.updatePayment(req.params.id, req.user!.userId, req.body);
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
