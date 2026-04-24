import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate';

export function requireTenant(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'TENANT') {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Se requiere cuenta de inquilino' } });
    return;
  }
  if (!req.user.tenantId) {
    res.status(403).json({
      error: {
        code: 'NO_TENANT_PROFILE',
        message: 'Tu cuenta no está vinculada a ninguna propiedad. Contactá a tu propietario.',
      },
    });
    return;
  }
  next();
}
