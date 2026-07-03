import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import {
  draftClaimController,
  propertyDescriptionController,
  monthlySummaryController,
} from './ai-actions.controller';

const router = Router();

router.use(authenticate);

router.post('/draft-claim', draftClaimController);
router.post('/property-description', propertyDescriptionController);
router.get('/monthly-summary', monthlySummaryController);

export default router;
