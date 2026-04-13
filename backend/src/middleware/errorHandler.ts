import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  status?: number;
  code?: string;
}

export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction): void {
  const status = err.status ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';
  const message = status < 500 ? err.message : 'Error interno del servidor';
  if (status >= 500) console.error(err);
  res.status(status).json({ error: { code, message } });
}
