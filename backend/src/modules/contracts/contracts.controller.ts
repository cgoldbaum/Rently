import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as contractsService from './contracts.service';

export async function createContractController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const contract = await contractsService.createContract(req.params.id as string, req.body);
    res.status(201).json({ data: contract });
  } catch (err) {
    next(err);
  }
}

export async function getContractController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const contract = await contractsService.getContract(req.params.id as string);
    res.json({ data: contract });
  } catch (err) {
    next(err);
  }
}

export async function updateContractController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const contract = await contractsService.updateContract(req.params.id as string, req.body);
    res.json({ data: contract });
  } catch (err) {
    next(err);
  }
}
