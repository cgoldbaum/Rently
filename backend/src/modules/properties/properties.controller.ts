import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as propertiesService from './properties.service';

export async function createPropertyController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const property = await propertiesService.createProperty(req.user!.userId, req.body);
    res.status(201).json({ data: property });
  } catch (err) {
    next(err);
  }
}

export async function listPropertiesController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const properties = await propertiesService.listProperties(req.user!.userId);
    res.json({ data: properties });
  } catch (err) {
    next(err);
  }
}

export async function getPropertyController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const property = await propertiesService.getProperty(req.params.id as string);
    res.json({ data: property });
  } catch (err) {
    next(err);
  }
}

export async function updatePropertyController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const property = await propertiesService.updateProperty(req.params.id as string, req.body);
    res.json({ data: property });
  } catch (err) {
    next(err);
  }
}
