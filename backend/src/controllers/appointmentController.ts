import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store.js';
import { queueService } from '../services/queueService.js';
import { socketService } from '../services/socketService.js';
import { notificationService } from '../services/notificationService.js';
import { AuthRequest } from '../middleware/auth.js';
import { Appointment, Token, PriorityLevel } from '../types/index.js';

export const createAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      doctor_id,
      appointment_date,
      appointment_time,
      appointment_type,
      patient_id,
      ai_summary,
      priority: requestedPriority
    } = req.body;

    const patientId = (req.user?.role === 'PATIENT' && req.user.id)
      ? req.user.id
      : (patient_id || req.user?.id || 'pat-01');

    if (!doctor_id || !appointment_date || !appointment_time) {
      res.status(400).json({ success: false, message: 'Doctor ID, appointment date, and appointment time are required.' });
      return;
    }

    const doctor = await store.getDoctorById(doctor_id);
    if (!doctor) {
      res.status(404).json({ success: false, message: 'Selected doctor not found.' });
      return;
    }

    const apptId = uuidv4();
    const tokenId = uuidv4();

    // Determine initial priority: AI priority (EMERGENCY/PRIORITY/NORMAL) or fallback
    const priority = (ai_summary?.urgency || requestedPriority || 'NORMAL') as PriorityLevel;

    // Generate unique sequential token number
    const tokenNumber = await queueService.generateNextTokenNumber(doctor_id, appointment_date);

    // Build appointment description including chief complaint if present
    const apptTypeDesc = ai_summary?.chief_complaint
      ? `${appointment_type || 'Consultation'} • AI Triage: ${ai_summary.chief_complaint}`
      : (appointment_type || 'General Consultation');

    // Calculate check-in deadline: appointment_time + 15 minute grace window
    const checkinDeadline = (() => {
      try {
        const [datePart] = appointment_date.split('T');
        // Parse time like "10:00 AM" or "14:30"
        let hours = 0, minutes = 0;
        const timeStr = appointment_time.replace(/\s/g, ' ').trim();
        const amPmMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (amPmMatch) {
          hours = parseInt(amPmMatch[1]);
          minutes = parseInt(amPmMatch[2]);
          const amPm = amPmMatch[3].toUpperCase();
          if (amPm === 'PM' && hours !== 12) hours += 12;
          if (amPm === 'AM' && hours === 12) hours = 0;
        } else {
          const parts = timeStr.split(':');
          hours = parseInt(parts[0]);
          minutes = parseInt(parts[1] || '0');
        }
        const deadlineDate = new Date(`${datePart}T${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:00`);
        deadlineDate.setMinutes(deadlineDate.getMinutes() + 15); // 15-min grace window
        return deadlineDate.toISOString();
      } catch {
        return null;
      }
    })();

    // AI-predicted consultation duration based on triage severity
    const predictedDuration = (() => {
      const severity = ai_summary?.severity?.toLowerCase() || '';
      const urgency = ai_summary?.urgency || priority;
      if (urgency === 'EMERGENCY') return 25;
      if (urgency === 'PRIORITY' || severity === 'severe') return 18;
      if (severity === 'moderate') return 12;
      return doctor?.average_consultation_time || 10; // mild or unknown
    })();

    // Initial appointment
    const appointment: Appointment = {
      id: apptId,
      patient_id: patientId,
      doctor_id,
      appointment_date,
      appointment_time,
      appointment_type: apptTypeDesc,
      status: 'WAITING',
      created_at: new Date().toISOString(),
      ai_summary: ai_summary || undefined,
    };

    await store.createAppointment(appointment);

    // Create token with AI urgency priority + deadline + predicted duration
    const token: Token = {
      id: tokenId,
      appointment_id: apptId,
      token_number: tokenNumber,
      priority: priority,
      status: 'WAITING',
      estimated_wait: 0,
      predicted_duration: predictedDuration,
      checkin_deadline: checkinDeadline,
      created_at: new Date().toISOString(),
    };

    await store.createToken(token);

    await store.logQueueEvent({
      id: uuidv4(),
      token_id: tokenId,
      event_type: 'GENERATED',
      created_at: new Date().toISOString(),
    });

    // If priority is EMERGENCY, automatically execute immediate Emergency Swap into the doctor room
    if (priority === 'EMERGENCY') {
      await queueService.emergencySwap(doctor_id, tokenId);
    } else {
      // Recalculate queue wait times
      const queueState = await queueService.calculateAndRecalculateQueue(doctor_id, appointment_date);
      // Broadcast live queue update
      socketService.emitQueueUpdate(doctor_id, queueState);
    }

    // Find the created token with updated waiting time
    const updatedToken = await store.getTokenById(tokenId);
    const enrichedAppt = await store.getAppointmentById(apptId);

    // Send user notification
    const user = await store.findUserById(patientId);
    if (user) {
      const notif = await notificationService.notifyUser(
        user.id,
        'Appointment Confirmed',
        `Your appointment with ${doctor.user_name} is booked. Your Token is ${tokenNumber}. Estimated wait: ${updatedToken?.estimated_wait || 15} minutes.`,
        'SUCCESS',
        user.phone
      );
      socketService.emitNotification(user.id, notif);
    }

    res.status(201).json({
      success: true,
      message: 'Appointment booked and token issued successfully.',
      data: {
        ...enrichedAppt,
        token: updatedToken,
      },
    });
  } catch (error: any) {
    console.error('Appointment booking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAppointments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (req.user.role === 'PATIENT') {
      const appts = await store.getAppointmentsByPatient(req.user.id);
      res.status(200).json({ success: true, count: appts.length, data: appts });
      return;
    }

    if (req.user.role === 'DOCTOR') {
      // req.user.id is the auth user_id — must resolve to doctors.id
      const doctorProfile = await store.getDoctorById(req.user.id);
      if (!doctorProfile) {
        res.status(404).json({ success: false, message: 'Doctor profile not found. Please complete your profile setup.' });
        return;
      }
      const appts = await store.getAppointmentsByDoctor(doctorProfile.id);
      res.status(200).json({ success: true, count: appts.length, data: appts });
      return;
    }

    // ADMIN
    const appts = await store.getAllAppointments();
    res.status(200).json({ success: true, count: appts.length, data: appts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAppointmentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const appt = await store.getAppointmentById(req.params.id as string);
    if (!appt) {
      res.status(404).json({ success: false, message: 'Appointment not found' });
      return;
    }
    res.status(200).json({ success: true, data: appt });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const appt = await store.getAppointmentById(req.params.id as string);
    if (!appt) {
      res.status(404).json({ success: false, message: 'Appointment not found' });
      return;
    }

    if (req.user?.role === 'PATIENT' && appt.patient_id !== req.user.id) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    await store.updateAppointment(appt.id, { status: 'CANCELLED' });
    
    if (appt.token) {
      await store.updateToken(appt.token.id, { status: 'CANCELLED' });
      await store.logQueueEvent({
        id: uuidv4(),
        token_id: appt.token.id,
        event_type: 'CANCELLED',
        created_at: new Date().toISOString(),
      });
    }

    // Recalculate doctor queue
    const queueState = await queueService.calculateAndRecalculateQueue(appt.doctor_id, appt.appointment_date);
    socketService.emitQueueUpdate(appt.doctor_id, queueState);

    res.status(200).json({ success: true, message: 'Appointment cancelled successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTokenById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const token = await store.getTokenById(req.params.id as string);
    if (!token) {
      res.status(404).json({ success: false, message: 'Token not found' });
      return;
    }
    res.status(200).json({ success: true, data: token });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const publicGetAppointmentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const appt = await store.getAppointmentById(req.params.id as string);
    if (!appt) {
      res.status(404).json({ success: false, message: 'Appointment not found' });
      return;
    }
    res.status(200).json({ success: true, data: appt });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const publicCancelAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const appt = await store.getAppointmentById(req.params.id as string);
    if (!appt) {
      res.status(404).json({ success: false, message: 'Appointment not found' });
      return;
    }

    await store.updateAppointment(appt.id, { status: 'CANCELLED' });

    if (appt.token) {
      await store.updateToken(appt.token.id, { status: 'CANCELLED' });
      await store.logQueueEvent({
        id: uuidv4(),
        token_id: appt.token.id,
        event_type: 'CANCELLED',
        created_at: new Date().toISOString(),
      });
    }

    // Recalculate doctor queue
    const queueState = await queueService.calculateAndRecalculateQueue(appt.doctor_id, appt.appointment_date);
    socketService.emitQueueUpdate(appt.doctor_id, queueState);

    res.status(200).json({ success: true, message: 'Digital Token cancelled successfully via QR Pass scan.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

