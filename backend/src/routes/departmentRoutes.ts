import { Router } from 'express';
import { getDepartments, createDepartment } from '../controllers/doctorController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = Router();

router.get('/', getDepartments);
router.post('/', authenticateToken, authorizeRoles('ADMIN'), createDepartment);

export default router;
