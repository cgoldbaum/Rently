import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as service from './scheduled-reports.service';

export async function listController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await service.listSchedules(req.user!.userId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function createController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const schedule = await service.createSchedule(req.user!.userId, req.body ?? {});
    res.status(201).json({ data: schedule });
  } catch (err) {
    next(err);
  }
}

export async function updateController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const schedule = await service.updateSchedule(req.user!.userId, String(req.params.id), req.body ?? {});
    if (!schedule) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Programación no encontrada' } });
      return;
    }
    res.json({ data: schedule });
  } catch (err) {
    next(err);
  }
}

export async function deleteController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.deleteSchedule(req.user!.userId, String(req.params.id));
    if (!result) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Programación no encontrada' } });
      return;
    }
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function runNowController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.sendScheduleNow(req.user!.userId, String(req.params.id));
    if (!result) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Programación no encontrada' } });
      return;
    }
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
