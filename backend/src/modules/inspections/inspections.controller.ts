import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as service from './inspections.service';

export async function listInspectionsController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await service.listInspections(req.user!.userId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function createInspectionController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await service.createInspection(req.user!.userId, req.body);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function updateInspectionController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await service.updateInspection(String(req.params.id), req.user!.userId, req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function deleteInspectionController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await service.deleteInspection(String(req.params.id), req.user!.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function splitPaymentController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { installmentCount, dueDates } = req.body;
    const data = await service.splitPaymentIntoInstallments(
      String(req.params.id),
      req.user!.userId,
      installmentCount,
      dueDates
    );
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}
