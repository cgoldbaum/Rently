import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import {
  draftClaimController,
  propertyDescriptionController,
  monthlySummaryController,
  suggestClaimReplyController,
  draftMessageController,
  explainAdjustmentController,
} from './ai-actions.controller';

const router = Router();

router.use(authenticate);

router.post('/draft-claim', draftClaimController);
router.post('/property-description', propertyDescriptionController);
router.get('/monthly-summary', monthlySummaryController);
router.post('/suggest-claim-reply', suggestClaimReplyController);
router.post('/draft-message', draftMessageController);
router.post('/explain-adjustment', explainAdjustmentController);

export default router;
