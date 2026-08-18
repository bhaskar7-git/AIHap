import { Router } from 'express';
import { getNotifications, markNotificationRead, markAllRead } from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, getNotifications);
router.put('/read-all', authenticateToken, markAllRead);
router.put('/:id/read', authenticateToken, markNotificationRead);

export default router;
