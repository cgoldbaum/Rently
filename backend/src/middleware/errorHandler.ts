import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/AppError';

export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction): void {
  const status = err.status ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';
  const isProduction = process.env.NODE_ENV === 'production';
  const t = _req.t;

  let message: string;
  if (t && err.i18nKey) {
    message = t(err.i18nKey, err.i18nParams ?? {});
  } else {
    message = status < 500 || !isProduction ? err.message : 'Error interno del servidor';
  }

  console.error(`[${status}] ${code}:`, message, err.stack?.split('\n').slice(0, 3).join('\n'));
  res.status(status).json({ error: { code, message, details: err.details } });
}
