import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
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
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Sesión no encontrada' } });
      return;
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
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Sesión no encontrada' } });
      return;
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
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'El mensaje no puede estar vacío' } });
      return;
    }
    if (content.length > 4000) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'El mensaje es demasiado largo' } });
      return;
    }

    const result = await aiChatService.sendMessage(
      req.user!.userId,
      req.user!.role,
      String(req.params.sessionId),
      content
    );

    if (!result) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Sesión no encontrada' } });
      return;
    }

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
