import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as chatService from './chat.service';

export async function getConversationsController(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const conversations = await chatService.getConversations(req.user!.userId);
    res.json({ data: conversations });
  } catch (err) {
    next(err);
  }
}

export async function getMessagesController(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const messages = await chatService.getMessages(
      req.user!.userId,
      String(req.params.contractId)
    );
    if (messages === null) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conversación no encontrada' } });
      return;
    }
    res.json({ data: messages });
  } catch (err) {
    next(err);
  }
}

export async function sendMessageController(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
    if (!body) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'El mensaje no puede estar vacío' } });
      return;
    }
    if (body.length > 2000) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'El mensaje es demasiado largo' } });
      return;
    }
    const message = await chatService.sendMessage(
      req.user!.userId,
      String(req.params.contractId),
      body
    );
    if (message === null) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conversación no encontrada' } });
      return;
    }
    res.status(201).json({ data: message });
  } catch (err) {
    next(err);
  }
}

export async function markReadController(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await chatService.markRead(
      req.user!.userId,
      String(req.params.contractId)
    );
    if (result === null) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conversación no encontrada' } });
      return;
    }
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
