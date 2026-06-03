import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as service from './tags.service';

export async function listTagsController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tags = await service.listTags(req.user!.userId);
    res.json({ data: tags });
  } catch (err) { next(err); }
}

export async function createTagController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tag = await service.createTag(req.user!.userId, req.body);
    res.status(201).json({ data: tag });
  } catch (err) { next(err); }
}

export async function updateTagController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tag = await service.updateTag(String(req.params.tagId), req.user!.userId, req.body);
    res.json({ data: tag });
  } catch (err) { next(err); }
}

export async function deleteTagController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await service.deleteTag(String(req.params.tagId), req.user!.userId);
    res.json({ data: { ok: true } });
  } catch (err) { next(err); }
}
