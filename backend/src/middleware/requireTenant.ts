import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from './authenticate';

/**
 * Permite el acceso al portal de inquilino a cualquier usuario que tenga al menos un
 * perfil de inquilino (sin importar su rol principal). El alquiler activo se resuelve
 * por request con el header `X-Tenant-Id`; si no se envía o no pertenece al usuario,
 * se usa el primer perfil. Deja el tenant activo en `req.user.tenantId`.
 */
export async function requireTenant(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No autenticado' } });
    return;
  }

  try {
    const profiles = await prisma.tenant.findMany({
      where: { userId: req.user.userId },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    if (profiles.length === 0) {
      res.status(403).json({
        error: {
          code: 'NO_TENANT_PROFILE',
          message: 'Tu cuenta no está vinculada a ninguna propiedad. Contactá a tu propietario.',
        },
      });
      return;
    }

    const requested = req.header('X-Tenant-Id');
    const active = requested && profiles.some((p) => p.id === requested) ? requested : profiles[0].id;
    req.user.tenantId = active;
    next();
  } catch (err) {
    next(err);
  }
}
