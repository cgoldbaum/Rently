import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as service from './subscriptions.service';

export async function listPlansController(_req: Request, res: Response, next: NextFunction) {
  try {
    const plans = await service.listPlans();
    res.json({ data: plans });
  } catch (err) {
    next(err);
  }
}

export async function getSubscriptionController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const summary = await service.getSubscriptionSummary(req.user!.userId);
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
}

export async function createCheckoutController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await service.createCheckout(req.user!.userId, req.body.planCode);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function cancelSubscriptionController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await service.cancelSubscription(req.user!.userId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function changePlanController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await service.cancelSubscription(req.user!.userId).catch(() => {});
    const result = await service.createCheckout(req.user!.userId, req.body.planCode);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getPublicMockSubscriptionController(req: Request, res: Response, next: NextFunction) {
  try {
    const subscription = await service.getPublicMockSubscription(req.params.subscriptionId as string);
    res.json({ data: subscription });
  } catch (err) {
    next(err);
  }
}

export async function confirmPublicMockSubscriptionController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.confirmPublicMockSubscription(req.params.subscriptionId as string);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
