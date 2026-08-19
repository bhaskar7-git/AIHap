import axios from 'axios';
import { supabase } from '../lib/supabase.js';
import {
  User,
  Hospital,
  Department,
  Doctor,
  Appointment,
  Token,
  QueueState,
  AdminDashboardData,
  Notification
} from '../types/index.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach Supabase access token
api.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token && config.headers) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for 401 handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname;
      if (!path.includes('/login') && !path.includes('/register')) {
        await supabase.auth.signOut();
      }
    }
    return Promise.reject(error);
  }
);

// --- Auth APIs ---
export const authApi = {
  register: (data: { name: string; email: string; phone: string; password: string; role?: string }) =>
    api.post<{ success: boolean; token: string; user: User; message: string }>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<{ success: boolean; token: string; user: User; message: string }>('/auth/login', data),

  getMe: () =>
    api.get<{ success: boolean; user: User }>('/auth/me'),
};

// --- Hospital APIs ---
export const hospitalApi = {
  getAll: () =>
    api.get<{ success: boolean; data: Hospital[] }>('/hospitals'),

  getById: (id: string) =>
    api.get<{ success: boolean; data: Hospital & { departments: Department[] } }>(`/hospitals/${id}`),

  create: (data: Partial<Hospital>) =>
    api.post<{ success: boolean; data: Hospital }>('/hospitals', data),
};

// --- Department APIs ---
export const departmentApi = {
  getAll: (hospitalId?: string) =>
    api.get<{ success: boolean; data: Department[] }>('/departments', { params: { hospitalId } }),

  create: (data: Partial<Department>) =>
    api.post<{ success: boolean; data: Department }>('/departments', data),
};

// --- Doctor APIs ---
export const doctorApi = {
  getAll: (params?: { departmentId?: string; hospitalId?: string; search?: string }) =>
    api.get<{ success: boolean; data: Doctor[] }>('/doctors', { params }),

  getById: (id: string) =>
    api.get<{ success: boolean; data: Doctor }>(`/doctors/${id}`),

  update: (id: string, data: Partial<Doctor>) =>
    api.put<{ success: boolean; data: Doctor }>(`/doctors/${id}`, data),

  create: (data: any) =>
    api.post<{ success: boolean; data: Doctor }>('/doctors', data),
};

// --- AI Clinical Triage APIs ---
export interface InterimRelief {
  recommended_remedy: string;
  purpose: string;
  dosage_instruction: string;
  disclaimer: string;
  safety_precautions: string;
}

export interface TriageResponse {
  message: string;
  is_ready_for_recommendation: boolean;
  diagnostic_stage?: 'GATHERING_INFO' | 'COMPLETE';
  triage?: {
    specialization_needed: string;
    urgency: 'NORMAL' | 'PRIORITY' | 'EMERGENCY';
    chief_complaint: string;
    onset_and_duration?: string;
    duration?: string;
    severity?: string;
    pain_characteristics?: string;
    notes?: string;
  };
  interim_relief?: InterimRelief;
  recommended_doctors?: Array<{
    doctor: Doctor;
    match_score: number;
    match_reason: string;
  }>;
  suggested_slots?: string[];
  quick_replies?: string[];
}

export const aiApi = {
  chatTriage: (
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    preferredDate?: string,
    preferredTime?: string,
    language?: string
  ) =>
    api.post<{ success: boolean; data: TriageResponse }>('/ai/chat-triage', {
      messages,
      preferredDate,
      preferredTime,
      language,   // locale code e.g. "hi-IN", "ta-IN" — backend maps to language name
    }),
};

// --- Appointment APIs ---
export const appointmentApi = {
  create: (data: {
    doctor_id: string;
    appointment_date: string;
    appointment_time: string;
    appointment_type?: string;
    ai_summary?: any;
    priority?: 'NORMAL' | 'PRIORITY' | 'EMERGENCY';
  }) =>
    api.post<{ success: boolean; data: Appointment; message: string }>('/appointments', data),

  getAll: () =>
    api.get<{ success: boolean; data: Appointment[] }>('/appointments'),

  getById: (id: string) =>
    api.get<{ success: boolean; data: Appointment }>(`/appointments/${id}`),

  cancel: (id: string) =>
    api.post<{ success: boolean; message: string }>(`/appointments/${id}/cancel`),

  getTokenById: (id: string) =>
    api.get<{ success: boolean; data: Token }>(`/tokens/${id}`),
};

// --- Queue Engine APIs ---
export const queueApi = {
  getDoctorQueue: (doctorId: string, date?: string) =>
    api.get<{ success: boolean; data: QueueState }>(`/queue/${doctorId}`, { params: { date } }),

  callNext: (doctorId: string) =>
    api.post<{ success: boolean; data: { calledToken: Token | null; queueState: QueueState }; message: string }>(`/queue/${doctorId}/call-next`),

  startConsultation: (doctorId: string, tokenId: string) =>
    api.post<{ success: boolean; data: QueueState }>(`/queue/${doctorId}/start/${tokenId}`),

  completeConsultation: (doctorId: string, tokenId: string) =>
    api.post<{ success: boolean; data: QueueState }>(`/queue/${doctorId}/complete/${tokenId}`),

  markNoShow: (doctorId: string, tokenId: string) =>
    api.post<{ success: boolean; data: QueueState }>(`/queue/${doctorId}/no-show/${tokenId}`),

  setPriority: (tokenId: string, priority: 'NORMAL' | 'PRIORITY' | 'EMERGENCY') =>
    api.post<{ success: boolean; data: { token: Token; queueState: QueueState } }>(`/queue/priority/${tokenId}`, { priority }),

  emergencySwap: (doctorId: string, tokenId: string) =>
    api.post<{
      success: boolean;
      message: string;
      data: {
        emergencyToken: Token;
        previousToken: Token | null;
        queueState: QueueState;
        message: string;
      };
    }>(`/queue/${doctorId}/emergency-swap/${tokenId}`),

  patientArrival: (tokenId: string) =>
    api.post<{ success: boolean; message: string; data: { token: Token | null; queueState: QueueState } }>(`/queue/arrive/${tokenId}`),
};

// --- Admin APIs ---
export const adminApi = {
  getDashboard: () =>
    api.get<{ success: boolean; data: AdminDashboardData }>('/admin/dashboard'),

  getStatistics: () =>
    api.get<{ success: boolean; data: any }>('/admin/statistics'),
};

// --- Notification APIs ---
export const notificationApi = {
  getAll: () =>
    api.get<{ success: boolean; data: Notification[] }>('/notifications'),

  markAsRead: (id: string) =>
    api.put<{ success: boolean; data: Notification }>(`/notifications/${id}/read`),

  markAllAsRead: () =>
    api.put<{ success: boolean; message: string }>('/notifications/read-all'),
};
