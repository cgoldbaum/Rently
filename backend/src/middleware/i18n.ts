import { Request, Response, NextFunction } from 'express';
import type { TFunction } from 'i18next';
import { resolveLanguage, getT, type Language } from '../i18n';

declare global {
  namespace Express {
    interface Request {
      language: Language;
      t: TFunction;
    }
  }
}

export function i18nMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const lang = resolveLanguage(req.headers['accept-language']);
  req.language = lang;
  req.t = getT(lang);
  next();
}
