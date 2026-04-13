import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { AuthRequest } from '../../middleware/authenticate';

export async function registerController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ data: user });
  } catch (err) {
    next(err);
  }
}

export async function loginController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { accessToken, refreshToken, user } = await authService.login(req.body);
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ data: { accessToken, user } });
  } catch (err) {
    next(err);
  }
}

export async function refreshController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No refresh token' } });
      return;
    }
    const tokens = await authService.refresh(token);
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ data: { accessToken: tokens.accessToken } });
  } catch (err) {
    next(err);
  }
}

export async function logoutController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.refreshToken;
    if (token) await authService.logout(token);
    res.clearCookie('refreshToken');
    res.json({ data: { message: 'Logged out' } });
  } catch (err) {
    next(err);
  }
}

export async function getMeController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getMe(req.user!.userId);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}

export async function updateMeController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.updateMe(req.user!.userId, req.body);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}

export async function deleteMeController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.deleteMe(req.user!.userId);
    res.clearCookie('refreshToken');
    res.json({ data: { message: 'Account deleted' } });
  } catch (err) {
    next(err);
  }
}
