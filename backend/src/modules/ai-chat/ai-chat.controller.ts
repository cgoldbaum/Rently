import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { AppError } from '../../lib/AppError';
import * as aiChatService from './ai-chat.service';

export async function listSessionsController(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const sessions = await aiChatService.listSessions(req.user!.userId);
    res.json({ data: sessions });
  } catch (err) {
    next(err);
  }
}

export async function createSessionController(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const { title, contractId } = req.body ?? {};
    const session = await aiChatService.createSession(req.user!.userId, title, contractId);
    res.status(201).json({ data: session });
  } catch (err) {
    next(err);
  }
}

export async function getSessionController(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const session = await aiChatService.getSession(req.user!.userId, String(req.params.sessionId));
    if (!session) {
      throw new AppError('errors:aiChat.sessionNotFound', 404);
    }
    res.json({ data: session });
  } catch (err) {
    next(err);
  }
}

export async function getOrCreateContractSessionController(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const session = await aiChatService.getOrCreateContractSession(
      req.user!.userId,
      String(req.params.contractId)
    );
    res.json({ data: session });
  } catch (err) {
    next(err);
  }
}

export async function deleteSessionController(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const result = await aiChatService.deleteSession(req.user!.userId, String(req.params.sessionId));
    if (!result) {
      throw new AppError('errors:aiChat.sessionNotFound', 404);
    }
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function sendMessageController(
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> {
  try {
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (!content) {
      throw new AppError('errors:aiChat.emptyMessage', 400);
    }
    if (content.length > 4000) {
      throw new AppError('errors:aiChat.messageTooLong', 400);
    }

    // Contexto opcional: pantalla que el usuario está viendo (asistente flotante).
    const pageContext = typeof req.body?.page === 'string'
      ? req.body.page.trim().slice(0, 60)
      : undefined;

    const result = await aiChatService.sendMessage(
      req.user!.userId,
      req.user!.role,
      String(req.params.sessionId),
      content,
      pageContext || undefined
    );

    if (!result) {
      throw new AppError('errors:aiChat.sessionNotFound', 404);
    }

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
