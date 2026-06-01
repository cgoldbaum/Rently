import { Router } from 'express';
import { validateBody } from '../../middleware/validateBody';
import { registerSchema, loginSchema } from './auth.schema';
import { authenticate } from '../../middleware/authenticate';
import {
  registerController,
  loginController,
  refreshController,
  logoutController,
  getMeController,
  updateMeController,
  deleteMeController,
  forgotPasswordController,
  resetPasswordController,
  savePushTokenController,
} from './auth.controller';

const router = Router();

router.post('/register', validateBody(registerSchema), registerController);
router.post('/login', validateBody(loginSchema), loginController);
router.post('/refresh', refreshController);
router.post('/logout', logoutController);
router.get('/me', authenticate, getMeController);
router.patch('/me', authenticate, updateMeController);
router.delete('/me', authenticate, deleteMeController);
router.post('/forgot-password', forgotPasswordController);
router.post('/reset-password', resetPasswordController);
router.post('/push-token', authenticate, savePushTokenController);

export default router;
