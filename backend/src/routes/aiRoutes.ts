import { Router } from 'express';
import { chatTriageAndRecommend } from '../controllers/aiController.js';

const router = Router();

router.post('/chat-triage', chatTriageAndRecommend);

export default router;
