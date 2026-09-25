import { Router } from 'express';
import { register, login, getMe, syncProfile } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Active auth endpoints (Supabase-first with local fallback)
router.post('/register', register);
router.post('/login', login);

// Profile
router.get('/me', authenticateToken, getMe);
router.post('/sync-profile', syncProfile);

export default router;
