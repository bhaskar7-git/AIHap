export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';
export type PriorityLevel = 'NORMAL' | 'PRIORITY' | 'EMERGENCY';
export type TokenStatus = 'WAITING' | 'CALLED' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type AppointmentStatus = 'BOOKED' | 'WAITING' | 'CALLED' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT' | 'URGENT';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  created_at: string;
}

export interface Department {
  id: string;
  hospital_id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Doctor {
  id: string;
  user_id: string;
  hospital_id: string;
  department_id: string;
  specialization: string;
  qualification: string;
  average_consultation_time: number; // minutes
  available: boolean;
  created_at: string;
  // Joined fields for convenience
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  department_name?: string;
  hospital_name?: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  appointment_type: string;
  status: AppointmentStatus;
  created_at: string;
  // Joined fields
  patient_name?: string;
  patient_email?: string;
  patient_phone?: string;
  doctor_name?: string;
  specialization?: string;
  department_name?: string;
  hospital_name?: string;
  token?: Token;
  ai_summary?: {
    chief_complaint: string;
    duration?: string;
    severity?: string;
    urgency?: PriorityLevel;
    notes?: string;
  };
}

export interface Token {
  id: string;
  appointment_id: string;
  token_number: string;
  priority: PriorityLevel;
  status: TokenStatus;
  estimated_wait: number; // in minutes
  created_at: string;
  called_at?: string | null;
  completed_at?: string | null;
  // Joined metadata
  patient_name?: string;
  patient_phone?: string;
  doctor_id?: string;
  doctor_name?: string;
  department_name?: string;
  hospital_name?: string;
  appointment_date?: string;
  appointment_time?: string;
  room_number?: string;
}

export interface QueueEvent {
  id: string;
  token_id: string;
  event_type: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  created_at: string;
}

export interface QueueState {
  doctor: Doctor;
  currentToken: Token | null;
  waitingCount: number;
  completedCount: number;
  noShowCount: number;
  totalToday: number;
  averageWaitTime: number;
  tokens: Token[];
}
