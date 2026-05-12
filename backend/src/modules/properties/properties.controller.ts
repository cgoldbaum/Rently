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

export async function deletePropertyController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await propertiesService.deleteProperty(req.params.id as string, req.user!.userId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function exportDescriptionController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const pdfBuffer = await propertiesService.exportDescriptionPdf(req.params.id as string, req.user!.userId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="propiedad-${req.params.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

export async function getPropertyExpenseReceiptsController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await propertiesService.getPropertyExpenseReceipts(String(req.params['id']));
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
