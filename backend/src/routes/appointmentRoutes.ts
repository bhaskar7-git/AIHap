import { Router } from 'express';
import {
  createAppointment,
  getAppointments,
  getAppointmentById,
  cancelAppointment,
  getTokenById,
  publicGetAppointmentById,
  publicCancelAppointment,
} from '../controllers/appointmentController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Public QR Code token access & cancellation routes
router.get('/public/:id', publicGetAppointmentById);
router.post('/public/:id/cancel', publicCancelAppointment);

// Protected routes
router.post('/', authenticateToken, createAppointment);
router.get('/', authenticateToken, getAppointments);
router.get('/:id', authenticateToken, getAppointmentById);
router.post('/:id/cancel', authenticateToken, cancelAppointment);

export default router;

