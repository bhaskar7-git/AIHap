import { Router } from 'express';
import { getDoctors, getDoctorById, updateDoctor, createDoctor, getDepartments, createDepartment } from '../controllers/doctorController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = Router();

router.get('/', getDoctors);
router.get('/:id', getDoctorById);
router.put('/:id', authenticateToken, updateDoctor);
router.post('/', authenticateToken, authorizeRoles('ADMIN'), createDoctor);

export default router;
