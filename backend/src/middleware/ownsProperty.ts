import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from './authenticate';

export async function ownsProperty(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const propertyId = req.params.id as string;
  const userId = req.user!.userId;

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Property not found' } });
    return;
  }

  if (property.userId !== userId) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    return;
  }

  next();
}
