import { Router } from 'express';
import { getHospitals, getHospitalById, createHospital } from '../controllers/hospitalController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = Router();

router.get('/', getHospitals);
router.get('/:id', getHospitalById);
router.post('/', authenticateToken, authorizeRoles('ADMIN'), createHospital);

export default router;
