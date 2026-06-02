import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  status?: number;
  code?: string;
  details?: unknown;
}

export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction): void {
  const status = err.status ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';
  const isProduction = process.env.NODE_ENV === 'production';
  const message = status < 500 || !isProduction ? err.message : 'Error interno del servidor';
  console.error(`[${status}] ${code}:`, err.message, err.stack?.split('\n').slice(0, 3).join('\n'));
  res.status(status).json({ error: { code, message, details: err.details } });
}
