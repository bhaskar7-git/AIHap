import { Router } from 'express';
import { getTokenById } from '../controllers/appointmentController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/:id', authenticateToken, getTokenById);

export default router;
