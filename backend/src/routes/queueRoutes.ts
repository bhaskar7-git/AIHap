import { Router } from 'express';
import {
  getDoctorQueue,
  callNextPatient,
  startConsultation,
  completeConsultation,
  markNoShow,
  setTokenPriority,
  patientArrival,
} from '../controllers/queueController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// Public / Patient can check queue state
router.get('/:doctorId', getDoctorQueue);

// Patient check-in "I'm Here" (15 min window from appointment time)
router.post('/arrive/:tokenId', authenticateToken, authorizeRoles('PATIENT', 'ADMIN'), patientArrival);

// Protected actions for Doctor & Admin
router.post('/:doctorId/call-next', authenticateToken, authorizeRoles('DOCTOR', 'ADMIN'), callNextPatient);
router.post('/:doctorId/start/:tokenId', authenticateToken, authorizeRoles('DOCTOR', 'ADMIN'), startConsultation);
router.post('/:doctorId/start', authenticateToken, authorizeRoles('DOCTOR', 'ADMIN'), startConsultation);
router.post('/:doctorId/complete/:tokenId', authenticateToken, authorizeRoles('DOCTOR', 'ADMIN'), completeConsultation);
router.post('/:doctorId/complete', authenticateToken, authorizeRoles('DOCTOR', 'ADMIN'), completeConsultation);
router.post('/:doctorId/no-show/:tokenId', authenticateToken, authorizeRoles('DOCTOR', 'ADMIN'), markNoShow);
router.post('/:doctorId/no-show', authenticateToken, authorizeRoles('DOCTOR', 'ADMIN'), markNoShow);
router.post('/:doctorId/priority/:tokenId', authenticateToken, authorizeRoles('DOCTOR', 'ADMIN'), setTokenPriority);
router.post('/priority/:tokenId', authenticateToken, authorizeRoles('DOCTOR', 'ADMIN'), setTokenPriority);

export default router;
