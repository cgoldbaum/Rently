import { Response, NextFunction, Request } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as service from './adjustments.service';
import { fetchIndexVariation } from '../../lib/indexFetcher';
import { Country, IndexType } from '@prisma/client';

function asSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

export async function listAdjustmentsByOwnerController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const adjustments = await service.listAdjustmentsByOwner(req.user!.userId);
    res.json({ data: adjustments });
  } catch (err) {
    next(err);
  }
}

export async function listAdjustmentsByContractController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const adjustments = await service.listAdjustmentsByContract(asSingleParam(req.params.contractId));
    res.json({ data: adjustments });
  } catch (err) {
    next(err);
  }
}

export async function createAdjustmentController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const adjustment = await service.createAdjustment(asSingleParam(req.params.contractId), req.user!.userId, req.body);
    res.status(201).json({ data: adjustment });
  } catch (err) {
    next(err);
  }
}

export async function getCurrentIndexController(req: Request, res: Response, next: NextFunction) {
  try {
    const country = asSingleParam(req.query.country as string | undefined) as Country;
    const indexType = asSingleParam(req.query.indexType as string | undefined) as IndexType;

    const validCountries: Country[] = ['AR', 'CL', 'CO', 'UY'];
    const validIndexTypes: IndexType[] = ['IPC', 'ICL'];

    if (!validCountries.includes(country) || !validIndexTypes.includes(indexType)) {
      res.status(400).json({ error: 'Parámetros inválidos' });
      return;
    }

    const variation = await fetchIndexVariation(country, indexType);
    res.json({ data: { country, indexType, variation } });
  } catch (err) {
    next(err);
  }
}
