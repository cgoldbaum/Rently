import { Request, Response, NextFunction } from 'express';
import * as service from './photos.service';

export async function listPhotosController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.userId;
    const photos = await service.listPhotos(req.params.id as string, userId);
    res.json({ data: photos });
  } catch (err) { next(err); }
}

export async function addPhotosController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.userId;
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: { message: 'Se requiere al menos una imagen' } });
    }
    const photos = await service.addPhotos(req.params.id as string, userId, files);
    res.status(201).json({ data: photos });
  } catch (err) { next(err); }
}

export async function deletePhotoController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.userId;
    await service.deletePhoto(req.params.id as string, req.params.photoId as string, userId);
    res.json({ data: { ok: true } });
  } catch (err) { next(err); }
}
