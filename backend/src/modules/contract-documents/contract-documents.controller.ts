import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../lib/AppError';
import * as service from './contract-documents.service';

export async function getDocumentController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const doc = await service.getDocument(req.params.contractId as string, userId);
    res.json({ data: doc });
  } catch (err) { next(err); }
}

export async function uploadDocumentController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const file = req.file;
    if (!file) throw new AppError('Se requiere un archivo PDF', 400);
    const doc = await service.uploadDocument(req.params.contractId as string, userId, file);
    res.status(201).json({ data: doc });
  } catch (err) { next(err); }
}
