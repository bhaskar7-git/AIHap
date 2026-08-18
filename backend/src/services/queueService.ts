import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store.js';
import { socketService } from './socketService.js';
import { notificationService } from './notificationService.js';
import { Token, TokenStatus, PriorityLevel, Doctor, QueueState } from '../types/index.js';

export class QueueService {
  /**
   * Sort waiting tokens:
   * Order: EMERGENCY > PRIORITY > NORMAL
   * Within same priority: ARRIVED (checked-in) patients first, then by FIFO
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
      if (weightA !== weightB) return weightA - weightB;

      // Within same priority: arrived patients go FIRST
      const aArrived = a.arrived_at ? 1 : 0;
      const bArrived = b.arrived_at ? 1 : 0;
      if (aArrived !== bArrived) return bArrived - aArrived; // arrived = higher

      // FIFO by creation time
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }

  /**
   * Auto-expire late tokens: if checkin_deadline has passed and patient never arrived,
   * mark as NO_SHOW to keep the queue moving.
   * Returns the count of auto-expired tokens.
   */
  private async autoExpireLateTokens(tokens: Token[]): Promise<number> {
    const now = Date.now();
    let expired = 0;
    for (const token of tokens) {
      if (
        token.status === 'WAITING' &&
        !token.arrived_at &&
        token.checkin_deadline &&
        new Date(token.checkin_deadline).getTime() < now
      ) {
        await store.updateToken(token.id, { status: 'NO_SHOW' });
        await store.updateAppointment(token.appointment_id, { status: 'NO_SHOW' });
        await store.logQueueEvent({
          id: uuidv4(),
          token_id: token.id,
          event_type: 'AUTO_EXPIRED_LATE',
          created_at: new Date().toISOString(),
        });
        // Notify patient
        const appt = await store.getAppointmentById(token.appointment_id);
        if (appt) {
          const notif = await notificationService.notifyUser(
            appt.patient_id,
            '⏰ Check-in Window Expired',
            `Your token ${token.token_number} has been auto-cancelled because you did not check in within the required time window. Please re-book if you still need a consultation.`,
            'ALERT',
            appt.patient_phone
          );
          socketService.emitNotification(appt.patient_id, notif);
        }
        expired++;
      }
    }
    return expired;
  }

  /**
   * Calculate Smart Queue Waiting Time.
   * Uses per-token predicted_duration (from AI) if available, else avg_consultation_time.
   * Auto-expires tokens past their check-in deadline.
   */
  public async calculateAndRecalculateQueue(doctorId: string, date?: string): Promise<QueueState> {
    const doctor = await store.getDoctorById(doctorId);
    const today = date || new Date().toISOString().split('T')[0];
    let tokens = await store.getTokensByDoctor(doctorId, today);

    const avgTime = doctor?.average_consultation_time || 10;

    // Auto-expire tokens past check-in deadline
    await this.autoExpireLateTokens(tokens);
    // Re-fetch after possible auto-expiry
    tokens = await store.getTokensByDoctor(doctorId, today);

    // Separate tokens by status
    const currentToken = tokens.find(t => t.status === 'CALLED' || t.status === 'IN_CONSULTATION') || null;
    const rawWaitingTokens = tokens.filter(t => t.status === 'WAITING');
    const waitingTokens = this.sortWaitingTokens(rawWaitingTokens);
    const completedTokens = tokens.filter(t => t.status === 'COMPLETED');
    const noShowTokens = tokens.filter(t => t.status === 'NO_SHOW');
    const arrivedTokens = rawWaitingTokens.filter(t => t.arrived_at);

    // Calculate current delay based on overrun of current consultation
    let currentDelay = 0;
    if (currentToken && currentToken.called_at) {
      const consultDuration = currentToken.predicted_duration || avgTime;
      const elapsedMinutes = Math.floor((Date.now() - new Date(currentToken.called_at).getTime()) / (1000 * 60));
      if (elapsedMinutes > consultDuration) {
        currentDelay = elapsedMinutes - consultDuration;
      }
    }

    // Assign dynamic waiting times using per-token predicted_duration
    let cumulativeWait = currentToken ? (currentToken.predicted_duration || avgTime) + currentDelay : 0;
    if (currentToken && currentToken.called_at) {
      // Subtract time already elapsed in current consultation
      const elapsedMinutes = Math.floor((Date.now() - new Date(currentToken.called_at).getTime()) / (1000 * 60));
      cumulativeWait = Math.max(0, cumulativeWait - elapsedMinutes) + currentDelay;
    }

    for (let i = 0; i < waitingTokens.length; i++) {
      const token = waitingTokens[i];
      const estWait = Math.max(2, cumulativeWait);
      if (token.estimated_wait !== estWait) {
        token.estimated_wait = estWait;
        await store.updateToken(token.id, { estimated_wait: estWait });
      }
      // Add this token's predicted duration for the next token
      cumulativeWait += (token.predicted_duration || avgTime);
    }

    // Current token wait is 0 (already being served)
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
      arrivedCount: arrivedTokens.length,
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
  /**
   * Patient checks in: "I'm Here" — marks arrived_at and bumps them up in queue
   */
  public async patientArrival(tokenId: string): Promise<{ token: Token | null; queueState: QueueState }> {
    const token = await store.getTokenById(tokenId);
    if (!token) throw new Error('Token not found');

    // Check if past deadline
    if (token.checkin_deadline && new Date(token.checkin_deadline).getTime() < Date.now()) {
      throw new Error('Check-in window has expired. You can no longer check in for this token.');
    }
    if (token.status !== 'WAITING') {
      throw new Error('You can only check in for tokens in WAITING status.');
    }

    const updatedToken = await store.markArrived(tokenId);
    await store.logQueueEvent({
      id: uuidv4(),
      token_id: tokenId,
      event_type: 'PATIENT_ARRIVED',
      created_at: new Date().toISOString(),
    });

    const appt = await store.getAppointmentById(token.appointment_id);
    if (appt) {
      const notif = await notificationService.notifyUser(
        appt.patient_id,
        '✅ You\'re Checked In!',
        `You have successfully checked in for Token ${token.token_number}. Please wait — we'll call you soon!`,
        'SUCCESS',
        appt.patient_phone
      );
      socketService.emitNotification(appt.patient_id, notif);
    }

    const doctorId = token.doctor_id || (appt ? appt.doctor_id : '');
    const date = token.appointment_date || new Date().toISOString().split('T')[0];
    const queueState = await this.calculateAndRecalculateQueue(doctorId, date);
    socketService.emitQueueUpdate(doctorId, queueState);

    return { token: updatedToken, queueState };
  }

}

export const queueService = new QueueService();
