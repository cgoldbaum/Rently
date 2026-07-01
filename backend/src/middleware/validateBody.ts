import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { createZodErrorMap } from '../i18n/zodErrorMap';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const options = req.t ? { error: createZodErrorMap(req.t) } : undefined;
    const result = schema.safeParse(req.body, options as any);
    if (!result.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: result.error.issues.map((e: any) => e.message).join(', '),
        },
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
