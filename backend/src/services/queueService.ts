import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store.js';
import { socketService } from './socketService.js';
import { notificationService } from './notificationService.js';
import { Token, TokenStatus, PriorityLevel, Doctor, QueueState } from '../types/index.js';

export class QueueService {
  /**
   * Sort waiting tokens according to priority and arrival
   * Priority: EMERGENCY (1) > PRIORITY (2) > NORMAL (3)
   */
  private sortWaitingTokens(tokens: Token[]): Token[] {
    const priorityWeight: Record<PriorityLevel, number> = {
      EMERGENCY: 1,
      PRIORITY: 2,
      NORMAL: 3,
    };

    return [...tokens].sort((a, b) => {
      const weightA = priorityWeight[a.priority] || 3;
      const weightB = priorityWeight[b.priority] || 3;
      if (weightA !== weightB) {
        return weightA - weightB;
      }
      // If same priority, FIFO by creation time / token number
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }

  /**
   * Calculate Smart Queue Waiting Time
   * estimated_wait = (patients_ahead * avg_consultation_time) + current_delay
   */
  public async calculateAndRecalculateQueue(doctorId: string, date?: string): Promise<QueueState> {
    const doctor = await store.getDoctorById(doctorId);
    const today = date || new Date().toISOString().split('T')[0];
    const tokens = await store.getTokensByDoctor(doctorId, today);

    const avgTime = doctor?.average_consultation_time || 10;

    // Separate tokens by status
    const currentToken = tokens.find(t => t.status === 'CALLED' || t.status === 'IN_CONSULTATION') || null;
    const rawWaitingTokens = tokens.filter(t => t.status === 'WAITING');
    const waitingTokens = this.sortWaitingTokens(rawWaitingTokens);
    const completedTokens = tokens.filter(t => t.status === 'COMPLETED');
    const noShowTokens = tokens.filter(t => t.status === 'NO_SHOW');

    // Calculate current delay if consultation has been active
    let currentDelay = 0;
    if (currentToken && currentToken.called_at) {
      const elapsedMinutes = Math.floor((Date.now() - new Date(currentToken.called_at).getTime()) / (1000 * 60));
      if (elapsedMinutes > avgTime) {
        currentDelay = elapsedMinutes - avgTime;
      }
    }

    // Assign dynamic waiting times to all waiting tokens
    for (let i = 0; i < waitingTokens.length; i++) {
      const token = waitingTokens[i];
      const patientsAhead = i + (currentToken ? 1 : 0);
      const estWait = Math.max(2, (patientsAhead * avgTime) + currentDelay);
      
      if (token.estimated_wait !== estWait) {
        token.estimated_wait = estWait;
        await store.updateToken(token.id, { estimated_wait: estWait });
      }
    }

    // If current token is active, its estimated wait is 0
    if (currentToken && currentToken.estimated_wait !== 0) {
      currentToken.estimated_wait = 0;
      await store.updateToken(currentToken.id, { estimated_wait: 0 });
    }

    const allOrderedTokens = [
      ...(currentToken ? [currentToken] : []),
      ...waitingTokens,
      ...completedTokens,
      ...noShowTokens,
      ...tokens.filter(t => t.status === 'CANCELLED')
    ];

    const queueState: QueueState = {
      doctor: doctor || ({} as Doctor),
      currentToken,
      waitingCount: waitingTokens.length,
      completedCount: completedTokens.length,
      noShowCount: noShowTokens.length,
      totalToday: tokens.length,
      averageWaitTime: avgTime,
      tokens: allOrderedTokens,
    };

    return queueState;
  }

  /**
   * Get Live Queue state for a doctor
   */
  public async getQueueState(doctorId: string, date?: string): Promise<QueueState> {
    return this.calculateAndRecalculateQueue(doctorId, date);
  }

  /**
   * Generate next sequential token for a doctor (e.g. A-21, A-22...)
   */
  public async generateNextTokenNumber(doctorId: string, date: string): Promise<string> {
    const existingTokens = await store.getTokensByDoctor(doctorId, date);
    const doctor = await store.getDoctorById(doctorId);
    const deptPrefix = doctor?.department_name ? doctor.department_name.charAt(0).toUpperCase() : 'A';
    
    // Find highest index
    let maxNum = 20; // Start demo sequences pleasantly around 21+ or sequential
    if (existingTokens.length > 0) {
      for (const t of existingTokens) {
        const parts = t.token_number.split('-');
        if (parts.length === 2) {
          const num = parseInt(parts[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }

    const nextNum = maxNum + 1;
    return `${deptPrefix}-${nextNum}`;
  }

  /**
   * Doctor calls NEXT patient
   */
  public async callNext(doctorId: string): Promise<{ success: boolean; calledToken: Token | null; queueState: QueueState }> {
    const today = new Date().toISOString().split('T')[0];
    const queueStateBefore = await this.calculateAndRecalculateQueue(doctorId, today);

    // If there is an active current token in consultation/called, complete it automatically
    if (queueStateBefore.currentToken) {
      const prev = queueStateBefore.currentToken;
      await store.updateToken(prev.id, {
        status: 'COMPLETED',
        completed_at: new Date().toISOString()
      });
      await store.updateAppointment(prev.appointment_id, { status: 'COMPLETED' });
      await store.logQueueEvent({
        id: uuidv4(),
        token_id: prev.id,
        event_type: 'COMPLETED',
        created_at: new Date().toISOString()
      });

      // Notify completed patient
      const appt = await store.getAppointmentById(prev.appointment_id);
      if (appt) {
        const notif = await notificationService.notifyUser(
          appt.patient_id,
          'Consultation Completed',
          'Your consultation with ' + (queueStateBefore.doctor.user_name || 'the doctor') + ' is completed.',
          'SUCCESS',
          appt.patient_phone
        );
        socketService.emitNotification(appt.patient_id, notif);
      }
    }

    // Find next eligible waiting token
    const waitingTokens = queueStateBefore.tokens.filter(t => t.status === 'WAITING');
    const sortedWaiting = this.sortWaitingTokens(waitingTokens);

    if (sortedWaiting.length === 0) {
      const updatedQueue = await this.calculateAndRecalculateQueue(doctorId, today);
      socketService.emitQueueUpdate(doctorId, updatedQueue);
      return { success: true, calledToken: null, queueState: updatedQueue };
    }

    const nextToCall = sortedWaiting[0];
    const nowIso = new Date().toISOString();

    await store.updateToken(nextToCall.id, {
      status: 'CALLED',
      called_at: nowIso,
      estimated_wait: 0
    });
    await store.updateAppointment(nextToCall.appointment_id, { status: 'CALLED' });
    await store.logQueueEvent({
      id: uuidv4(),
      token_id: nextToCall.id,
      event_type: 'CALLED',
      created_at: nowIso
    });

    // Notify the called patient IMMEDIATELY
    const appt = await store.getAppointmentById(nextToCall.appointment_id);
    const room = nextToCall.room_number || 'Room 204';
    if (appt) {
      const urgentNotif = await notificationService.notifyUser(
        appt.patient_id,
        '🚨 YOU ARE NEXT',
        `Token ${nextToCall.token_number}: Please proceed immediately to ${room} for consultation with ${queueStateBefore.doctor.user_name || 'the doctor'}.`,
        'URGENT',
        appt.patient_phone
      );
      socketService.emitNotification(appt.patient_id, urgentNotif);
      socketService.emitTokenStatus(appt.patient_id, {
        token: nextToCall,
        status: 'CALLED',
        message: `Please proceed to ${room}`
      });
    }

    // Check if 2nd patient in line exists and notify that their appointment is approaching
    if (sortedWaiting.length > 1) {
      const secondPatientToken = sortedWaiting[1];
      const secondAppt = await store.getAppointmentById(secondPatientToken.appointment_id);
      if (secondAppt) {
        const warnNotif = await notificationService.notifyUser(
          secondAppt.patient_id,
          'Appointment Approaching',
          `Your token ${secondPatientToken.token_number} is approaching. Only 1 patient ahead of you.`,
          'WARNING',
          secondAppt.patient_phone
        );
        socketService.emitNotification(secondAppt.patient_id, warnNotif);
      }
    }

    const finalQueue = await this.calculateAndRecalculateQueue(doctorId, today);
    socketService.emitQueueUpdate(doctorId, finalQueue);

    return {
      success: true,
      calledToken: finalQueue.currentToken,
      queueState: finalQueue
    };
  }

  /**
   * Start consultation
   */
  public async startConsultation(doctorId: string, tokenId: string): Promise<QueueState> {
    const today = new Date().toISOString().split('T')[0];
    const token = await store.getTokenById(tokenId);
    if (token) {
      await store.updateToken(tokenId, { status: 'IN_CONSULTATION' });
      await store.updateAppointment(token.appointment_id, { status: 'IN_CONSULTATION' });
      await store.logQueueEvent({
        id: uuidv4(),
        token_id: tokenId,
        event_type: 'CONSULTATION_STARTED',
        created_at: new Date().toISOString()
      });
    }

    const queue = await this.calculateAndRecalculateQueue(doctorId, today);
    socketService.emitQueueUpdate(doctorId, queue);
    return queue;
  }

  /**
   * Complete consultation
   */
  public async completeConsultation(doctorId: string, tokenId: string): Promise<QueueState> {
    const today = new Date().toISOString().split('T')[0];
    const token = await store.getTokenById(tokenId);
    if (token) {
      await store.updateToken(tokenId, {
        status: 'COMPLETED',
        completed_at: new Date().toISOString()
      });
      await store.updateAppointment(token.appointment_id, { status: 'COMPLETED' });
      await store.logQueueEvent({
        id: uuidv4(),
        token_id: tokenId,
        event_type: 'COMPLETED',
        created_at: new Date().toISOString()
      });

      const appt = await store.getAppointmentById(token.appointment_id);
      if (appt) {
        const notif = await notificationService.notifyUser(
          appt.patient_id,
          'Consultation Completed',
          'Your appointment and consultation have been completed successfully.',
          'SUCCESS',
          appt.patient_phone
        );
        socketService.emitNotification(appt.patient_id, notif);
      }
    }

    const queue = await this.calculateAndRecalculateQueue(doctorId, today);
    socketService.emitQueueUpdate(doctorId, queue);
    return queue;
  }

  /**
   * Mark patient as NO SHOW
   */
  public async markNoShow(doctorId: string, tokenId: string): Promise<QueueState> {
    const today = new Date().toISOString().split('T')[0];
    const token = await store.getTokenById(tokenId);
    if (token) {
      await store.updateToken(tokenId, { status: 'NO_SHOW' });
      await store.updateAppointment(token.appointment_id, { status: 'NO_SHOW' });
      await store.logQueueEvent({
        id: uuidv4(),
        token_id: tokenId,
        event_type: 'NO_SHOW',
        created_at: new Date().toISOString()
      });

      const appt = await store.getAppointmentById(token.appointment_id);
      if (appt) {
        const notif = await notificationService.notifyUser(
          appt.patient_id,
          'Marked as No Show',
          `Your token ${token.token_number} was marked as No Show due to absence when called. Please contact the front desk if you have arrived.`,
          'ALERT',
          appt.patient_phone
        );
        socketService.emitNotification(appt.patient_id, notif);
      }
    }

    const queue = await this.calculateAndRecalculateQueue(doctorId, today);
    socketService.emitQueueUpdate(doctorId, queue);
    return queue;
  }

  /**
   * Update Priority (NORMAL, PRIORITY, EMERGENCY)
   */
  public async setPriority(tokenId: string, priority: PriorityLevel): Promise<{ token: Token; queueState: QueueState }> {
    const token = await store.getTokenById(tokenId);
    if (!token) throw new Error('Token not found');

    await store.updateToken(tokenId, { priority });
    await store.logQueueEvent({
      id: uuidv4(),
      token_id: tokenId,
      event_type: 'PRIORITY_CHANGED',
      created_at: new Date().toISOString()
    });

    const appt = await store.getAppointmentById(token.appointment_id);
    if (appt) {
      if (priority === 'EMERGENCY' || priority === 'PRIORITY') {
        const notif = await notificationService.notifyUser(
          appt.patient_id,
          `Queue Priority Updated: ${priority}`,
          `Your token ${token.token_number} has been prioritized by the hospital staff (${priority}).`,
          'ALERT',
          appt.patient_phone
        );
        socketService.emitNotification(appt.patient_id, notif);
      }
    }

    const doctorId = token.doctor_id || (appt ? appt.doctor_id : '');
    const today = token.appointment_date || new Date().toISOString().split('T')[0];
    const queueState = await this.calculateAndRecalculateQueue(doctorId, today);

    socketService.emitQueueUpdate(doctorId, queueState);

    const updatedToken = await store.getTokenById(tokenId);
    return { token: updatedToken!, queueState };
  }
}

export const queueService = new QueueService();
