import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { AppError } from '../../lib/AppError';
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
      throw new AppError('Conversación no encontrada', 404);
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
      throw new AppError('El mensaje no puede estar vacío', 400);
    }
    if (body.length > 2000) {
      throw new AppError('El mensaje es demasiado largo', 400);
    }
    const message = await chatService.sendMessage(
      req.user!.userId,
      String(req.params.contractId),
      body
    );
    if (message === null) {
      throw new AppError('Conversación no encontrada', 404);
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
      throw new AppError('Conversación no encontrada', 404);
    }
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
