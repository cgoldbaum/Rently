import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as dashboardService from './dashboard.service';

export async function getDashboardController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await dashboardService.getDashboard(req.user!.userId);
    res.json({ data: stats });
  } catch (err) {
    next(err);
  }
}

export async function getNotificationsController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const notifications = await dashboardService.getNotifications(req.user!.userId);
    res.json({ data: notifications });
  } catch (err) {
    next(err);
  }
}
