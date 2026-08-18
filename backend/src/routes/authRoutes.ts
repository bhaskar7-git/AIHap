import { Router } from 'express';
import { register, login, getMe, syncProfile } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Kept as legacy stubs (return 410)
router.post('/register', register);
router.post('/login', login);

// Active endpoints
router.get('/me', authenticateToken, getMe);
router.post('/sync-profile', syncProfile);

export default router;
