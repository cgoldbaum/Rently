import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../lib/AppError';
import * as service from './claim-notes.service';

export async function listNotesController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const notes = await service.listNotes(req.params.id as string, userId);
    res.json({ data: notes });
  } catch (err) { next(err); }
}

export async function addNoteController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { content } = req.body;
    if (!content?.trim()) {
      throw new AppError('errors:badRequest', 400);
    }
    const note = await service.addNote(req.params.id as string, userId, content.trim());
    res.status(201).json({ data: note });
  } catch (err) { next(err); }
}
