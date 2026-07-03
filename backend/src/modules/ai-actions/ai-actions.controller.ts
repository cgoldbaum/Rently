import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { AppError } from '../../lib/AppError';
import * as aiActionsService from './ai-actions.service';

export async function draftClaimController(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : '';
    const title = typeof req.body?.title === 'string' ? req.body.title.trim().slice(0, 120) : undefined;

    if (!notes) {
      throw new AppError('errors:aiChat.emptyMessage', 400);
    }
    if (notes.length > 1000) {
      throw new AppError('errors:aiChat.messageTooLong', 400);
    }

    const text = await aiActionsService.draftClaim({ title, notes });
    res.json({ data: { text } });
  } catch (err) {
    next(err);
  }
}

export async function propertyDescriptionController(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const type = typeof req.body?.type === 'string' ? req.body.type.trim() : '';
    if (!type) {
      throw new AppError('errors:aiChat.emptyMessage', 400);
    }
    const surface = Number(req.body?.surface);
    const antiquity = Number(req.body?.antiquity);

    const text = await aiActionsService.propertyDescription({
      type,
      surface: Number.isFinite(surface) && surface > 0 ? surface : undefined,
      antiquity: Number.isFinite(antiquity) && antiquity >= 0 ? antiquity : undefined,
      name: typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 120) : undefined,
      address: typeof req.body?.address === 'string' ? req.body.address.trim().slice(0, 200) : undefined,
    });
    res.json({ data: { text } });
  } catch (err) {
    next(err);
  }
}

export async function suggestClaimReplyController(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const title = typeof req.body?.title === 'string' ? req.body.title.trim().slice(0, 120) : undefined;
    if (!description) {
      throw new AppError('errors:aiChat.emptyMessage', 400);
    }
    if (description.length > 2000) {
      throw new AppError('errors:aiChat.messageTooLong', 400);
    }
    const text = await aiActionsService.suggestClaimReply({ title, description });
    res.json({ data: { text } });
  } catch (err) {
    next(err);
  }
}

export async function draftMessageController(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : '';
    if (!notes) {
      throw new AppError('errors:aiChat.emptyMessage', 400);
    }
    if (notes.length > 1000) {
      throw new AppError('errors:aiChat.messageTooLong', 400);
    }
    const text = await aiActionsService.draftMessage({ notes });
    res.json({ data: { text } });
  } catch (err) {
    next(err);
  }
}

export async function explainAdjustmentController(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const previousAmount = Number(req.body?.previousAmount);
    const newAmount = Number(req.body?.newAmount);
    const percentage = Number(req.body?.percentage);
    const indexType = typeof req.body?.indexType === 'string' ? req.body.indexType.trim().slice(0, 20) : '';

    if (![previousAmount, newAmount, percentage].every(Number.isFinite) || !indexType) {
      throw new AppError('errors:aiChat.emptyMessage', 400);
    }

    const text = await aiActionsService.explainAdjustment({
      previousAmount,
      newAmount,
      percentage,
      indexType,
      currency: typeof req.body?.currency === 'string' ? req.body.currency.trim().slice(0, 5) : undefined,
    });
    res.json({ data: { text } });
  } catch (err) {
    next(err);
  }
}

export async function monthlySummaryController(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const text = await aiActionsService.monthlySummary(req.user!.userId);
    res.json({ data: { text } });
  } catch (err) {
    next(err);
  }
}
