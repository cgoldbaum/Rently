import { Request, Response, NextFunction } from 'express';
import * as svc from './webauthn.service';

export async function startRegistrationController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.userId;
    const options = await svc.startRegistration(userId);
    res.json({ data: options });
  } catch (err) { next(err); }
}

export async function finishRegistrationController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.userId;
    const result = await svc.finishRegistration(userId, req.body);
    res.json({ data: result });
  } catch (err) { next(err); }
}

export async function startAuthenticationController(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    if (!email) { res.status(400).json({ error: { message: 'Email requerido' } }); return; }
    const options = await svc.startAuthentication(email);
    res.json({ data: options });
  } catch (err) { next(err); }
}

export async function finishAuthenticationController(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, response } = req.body;
    if (!email || !response) { res.status(400).json({ error: { message: 'email y response requeridos' } }); return; }
    const result = await svc.finishAuthentication(email, response);
    res.json({ data: result });
  } catch (err) { next(err); }
}

export async function listCredentialsController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.userId;
    const creds = await svc.listCredentials(userId);
    res.json({ data: creds });
  } catch (err) { next(err); }
}

export async function deleteCredentialController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.userId;
    await svc.deleteCredential(userId, req.params.id as string);
    res.json({ data: { ok: true } });
  } catch (err) { next(err); }
}
