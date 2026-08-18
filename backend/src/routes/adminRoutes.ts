import { Router } from 'express';
import { getAdminDashboard, getAdminStatistics } from '../controllers/adminController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard', authenticateToken, authorizeRoles('ADMIN'), getAdminDashboard);
router.get('/statistics', authenticateToken, authorizeRoles('ADMIN'), getAdminStatistics);

export default router;
