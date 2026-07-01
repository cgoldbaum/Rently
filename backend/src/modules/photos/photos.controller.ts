import { AppError } from '../../lib/AppError';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as service from './photos.service';

export async function listPhotosController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const folderId = req.query.folderId as string | undefined;
    const photos = await service.listPhotos(String(req.params.id), userId, folderId);
    res.json({ data: photos });
  } catch (err) { next(err); }
}

function parseTagIds(raw: unknown): string[] | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new AppError('errors:tagIdsMustBeArray', 400, 'BAD_REQUEST');
      }
      return parsed as string[];
    } catch (err) {
      if ((err as any).code === 'BAD_REQUEST') throw err;
      throw new AppError('errors:photoUpload.invalidTagPayload', 400, 'BAD_REQUEST');
    }
  }
  throw new AppError('errors:photoUpload.invalidTagPayload', 400, 'BAD_REQUEST');
}

export async function addPhotosController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      throw new AppError('errors:photoUpload.noImage', 400);
    }
    const options: any = {};
    if (req.body.folderId) options.folderId = req.body.folderId;
    const tagIds = parseTagIds(req.body.tagIds);
    if (tagIds) options.tagIds = tagIds;
    if (req.body.caption) options.caption = req.body.caption;
    const photos = await service.addPhotos(String(req.params.id), userId, files, options);
    res.status(201).json({ data: photos });
  } catch (err) { next(err); }
}

export async function updatePhotoController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const data: any = {};
    if (req.body.folderId !== undefined) data.folderId = req.body.folderId;
    if (req.body.tagIds !== undefined) {
      data.tagIds = parseTagIds(req.body.tagIds) ?? [];
    }
    if (req.body.caption !== undefined) data.caption = req.body.caption;
    const photo = await service.updatePhoto(String(req.params.id), String(req.params.photoId), userId, data);
    res.json({ data: photo });
  } catch (err) { next(err); }
}

export async function deletePhotoController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const result = await service.deletePhoto(String(req.params.id), String(req.params.photoId), userId);
    res.json({ data: { ok: true, ...result } });
  } catch (err) { next(err); }
}
