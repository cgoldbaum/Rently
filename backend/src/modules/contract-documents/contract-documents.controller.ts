import { Request, Response, NextFunction } from 'express';
import * as service from './contract-documents.service';

export async function getDocumentController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.userId;
    const doc = await service.getDocument(req.params.contractId as string, userId);
    res.json({ data: doc });
  } catch (err) { next(err); }
}

export async function uploadDocumentController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.userId;
    const file = req.file;
    if (!file) return res.status(400).json({ error: { message: 'Se requiere un archivo PDF' } });
    const doc = await service.uploadDocument(req.params.contractId as string, userId, file);
    res.status(201).json({ data: doc });
  } catch (err) { next(err); }
}
