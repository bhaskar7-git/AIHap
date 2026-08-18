import { Router } from 'express';
import { createAppointment, getAppointments, getAppointmentById, cancelAppointment, getTokenById } from '../controllers/appointmentController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticateToken, createAppointment);
router.get('/', authenticateToken, getAppointments);
router.get('/:id', authenticateToken, getAppointmentById);
router.post('/:id/cancel', authenticateToken, cancelAppointment);

export default router;
