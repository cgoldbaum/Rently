import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { userId: string; role: string; tenantId?: string };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const message = req.t ? req.t('errors:missingOrInvalidToken') : 'Missing or invalid token';
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message } });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      role?: string;
      tenantId?: string;
    };
    req.user = {
      userId: payload.userId,
      role: payload.role ?? 'OWNER',
      tenantId: payload.tenantId,
    };
    next();
  } catch {
    const message = req.t ? req.t('errors:invalidOrExpiredToken') : 'Invalid or expired token';
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message } });
  }
}
