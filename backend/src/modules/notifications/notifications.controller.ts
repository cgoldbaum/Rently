import { Request, Response, NextFunction } from 'express';
import * as service from './notifications.service';

export async function listNotificationsController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.userId;
    const result = await service.listOwnerNotifications(userId);
    res.json({ data: result });
  } catch (err) { next(err); }
}

export async function markReadController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.userId;
    const notif = await service.markRead(req.params.id as string, userId);
    res.json({ data: notif });
  } catch (err) { next(err); }
}

export async function markAllReadController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.userId;
    await service.markAllRead(userId);
    res.json({ data: { ok: true } });
  } catch (err) { next(err); }
}
