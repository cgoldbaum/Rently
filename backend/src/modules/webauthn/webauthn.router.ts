import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import {
  startRegistrationController,
  finishRegistrationController,
  startAuthenticationController,
  finishAuthenticationController,
  listCredentialsController,
  deleteCredentialController,
} from './webauthn.controller';

const router = Router();

// Public: authentication (called before login, no token yet)
router.post('/authenticate/start', startAuthenticationController as any);
router.post('/authenticate/finish', finishAuthenticationController as any);

// Authenticated: manage credentials
router.post('/register/start', authenticate, startRegistrationController as any);
router.post('/register/finish', authenticate, finishRegistrationController as any);
router.get('/credentials', authenticate, listCredentialsController as any);
router.delete('/credentials/:id', authenticate, deleteCredentialController as any);

export default router;
