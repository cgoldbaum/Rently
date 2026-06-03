import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as service from './folders.service';

export async function listFoldersController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const folders = await service.listFolders(String(req.params.id), req.user!.userId);
    res.json({ data: folders });
  } catch (err) { next(err); }
}

export async function createFolderController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const folder = await service.createFolder(String(req.params.id), req.user!.userId, req.body);
    res.status(201).json({ data: folder });
  } catch (err) { next(err); }
}

export async function updateFolderController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const folder = await service.updateFolder(String(req.params.folderId), String(req.params.id), req.user!.userId, req.body);
    res.json({ data: folder });
  } catch (err) { next(err); }
}

export async function deleteFolderController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await service.deleteFolder(String(req.params.folderId), String(req.params.id), req.user!.userId);
    res.json({ data: { ok: true } });
  } catch (err) { next(err); }
}
