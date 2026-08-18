import { supabase } from '../lib/supabase.js';
import {
  User,
  Hospital,
  Department,
  Doctor,
  Appointment,
  Token,
  QueueEvent,
  Notification,
} from '../types/index.js';

class SupabaseStore {
  public async init(): Promise<void> {
    // Verify connection
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) {
      console.error('⚠️  Supabase connection check failed:', error.message);
    } else {
      console.log('✅ Connected to Supabase successfully.');
    }
  }

  public async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as User[];
  }

  // --- USERS / PROFILES ---
  public async findUserByEmail(email: string): Promise<User | null> {
    // Look up auth user by email, then join profile
    const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr) throw authErr;
    const authUser = authUsers.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase().trim()
    );
    if (!authUser) return null;
    return this.findUserById(authUser.id);
  }

  public async findUserById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    // Get email from auth
    const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(id);
    if (authErr || !authUser?.user) return data as User;
    return { ...data, email: authUser.user.email || '' } as User;
  }

  public async createUser(user: User): Promise<User> {
    // Auth user is already created by Supabase Auth (frontend signUp)
    // Just upsert the profile row
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        created_at: user.created_at,
      })
      .select()
      .single();
    if (error) throw error;
    return { ...data, email: user.email, password_hash: '' } as User;
  }

  // --- HOSPITALS ---
  public async getAllHospitals(): Promise<Hospital[]> {
    const { data, error } = await supabase
      .from('hospitals')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return (data || []) as Hospital[];
  }

  public async getHospitalById(id: string): Promise<Hospital | null> {
    const { data, error } = await supabase
      .from('hospitals')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as Hospital | null;
  }

  public async createHospital(hospital: Hospital): Promise<Hospital> {
    const { data, error } = await supabase
      .from('hospitals')
      .insert(hospital)
      .select()
      .single();
    if (error) throw error;
    return data as Hospital;
  }

  // --- DEPARTMENTS ---
  public async getAllDepartments(hospitalId?: string): Promise<Department[]> {
    let query = supabase.from('departments').select('*').order('name', { ascending: true });
    if (hospitalId) query = query.eq('hospital_id', hospitalId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Department[];
  }

  public async getDepartmentById(id: string): Promise<Department | null> {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as Department | null;
  }

  public async createDepartment(department: Department): Promise<Department> {
    const { data, error } = await supabase
      .from('departments')
      .insert(department)
      .select()
      .single();
    if (error) throw error;
    return data as Department;
  }

  // --- DOCTORS ---
  public async getAllDoctors(departmentId?: string, hospitalId?: string): Promise<Doctor[]> {
    let query = supabase
      .from('doctors')
      .select(`
        *,
        profiles!doctors_user_id_fkey ( name, phone ),
        departments ( name ),
        hospitals ( name )
      `);
    if (departmentId) query = query.eq('department_id', departmentId);
    if (hospitalId) query = query.eq('hospital_id', hospitalId);

    const { data, error } = await query;
    if (error) throw error;

    return ((data || []) as any[]).map((d) => ({
      ...d,
      user_name: d.profiles?.name || 'Dr. Specialist',
      user_phone: d.profiles?.phone,
      department_name: d.departments?.name || 'General Medicine',
      hospital_name: d.hospitals?.name || 'Smart Hospital',
    }));
  }

  public async getDoctorById(id: string): Promise<Doctor | null> {
    // id can be doctor.id or user_id
    let query = supabase
      .from('doctors')
      .select(`
        *,
        profiles!doctors_user_id_fkey ( name, phone ),
        departments ( name ),
        hospitals ( name )
      `);

    const { data: byId } = await query.eq('id', id).maybeSingle();
    const { data: byUserId } = !byId ? await supabase
      .from('doctors')
      .select(`
        *,
        profiles!doctors_user_id_fkey ( name, phone ),
        departments ( name ),
        hospitals ( name )
      `)
      .eq('user_id', id)
      .maybeSingle() : { data: null };

    const raw = byId || byUserId;
    if (!raw) return null;
    return {
      ...raw,
      user_name: (raw as any).profiles?.name || 'Dr. Specialist',
      user_phone: (raw as any).profiles?.phone,
      department_name: (raw as any).departments?.name || 'General Medicine',
      hospital_name: (raw as any).hospitals?.name || 'Smart Hospital',
    } as Doctor;
  }

  public async createDoctor(doctor: Doctor): Promise<Doctor> {
    const { data, error } = await supabase
      .from('doctors')
      .insert({
        id: doctor.id,
        user_id: doctor.user_id,
        hospital_id: doctor.hospital_id,
        department_id: doctor.department_id,
        specialization: doctor.specialization,
        qualification: doctor.qualification,
        average_consultation_time: doctor.average_consultation_time,
        available: doctor.available,
        created_at: doctor.created_at,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Doctor;
  }

  public async updateDoctor(id: string, updates: Partial<Doctor>): Promise<Doctor | null> {
    const { error } = await supabase
      .from('doctors')
      .update(updates)
      .or(`id.eq.${id},user_id.eq.${id}`);
    if (error) throw error;
    return this.getDoctorById(id);
  }

  // --- APPOINTMENTS ---
  public async createAppointment(appointment: Appointment): Promise<Appointment> {
    const { error } = await supabase.from('appointments').insert({
      id: appointment.id,
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
      appointment_type: appointment.appointment_type,
      status: appointment.status,
      created_at: appointment.created_at,
    });
    if (error) throw error;
    return this.getAppointmentById(appointment.id) as Promise<Appointment>;
  }

  public async getAppointmentById(id: string): Promise<Appointment | null> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        profiles!appointments_patient_id_fkey ( name, phone ),
        doctors!appointments_doctor_id_fkey (
          id, specialization,
          profiles!doctors_user_id_fkey ( name ),
          departments ( name ),
          hospitals ( name )
        ),
        tokens ( * )
      `)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return this.enrichAppointmentRow(data);
  }

  public async getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        profiles!appointments_patient_id_fkey ( name, phone ),
        doctors!appointments_doctor_id_fkey (
          id, specialization,
          profiles!doctors_user_id_fkey ( name ),
          departments ( name ),
          hospitals ( name )
        ),
        tokens ( * )
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ((data || []) as any[]).map((r) => this.enrichAppointmentRow(r));
  }

  public async getAppointmentsByDoctor(doctorId: string, date?: string): Promise<Appointment[]> {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        profiles!appointments_patient_id_fkey ( name, phone ),
        doctors!appointments_doctor_id_fkey (
          id, specialization,
          profiles!doctors_user_id_fkey ( name ),
          departments ( name ),
          hospitals ( name )
        ),
        tokens ( * )
      `)
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: true });
    if (date) query = query.eq('appointment_date', date);
    const { data, error } = await query;
    if (error) throw error;
    return ((data || []) as any[]).map((r) => this.enrichAppointmentRow(r));
  }

  public async getAllAppointments(): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        profiles!appointments_patient_id_fkey ( name, phone ),
        doctors!appointments_doctor_id_fkey (
          id, specialization,
          profiles!doctors_user_id_fkey ( name ),
          departments ( name ),
          hospitals ( name )
        ),
        tokens ( * )
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ((data || []) as any[]).map((r) => this.enrichAppointmentRow(r));
  }

  public async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | null> {
    const { error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
    return this.getAppointmentById(id);
  }

  private enrichAppointmentRow(row: any): Appointment {
    const token = Array.isArray(row.tokens) ? row.tokens[0] : row.tokens;
    return {
      ...row,
      patient_name: row.profiles?.name || 'Patient',
      patient_phone: row.profiles?.phone,
      doctor_name: row.doctors?.profiles?.name || 'Doctor',
      specialization: row.doctors?.specialization,
      department_name: row.doctors?.departments?.name,
      hospital_name: row.doctors?.hospitals?.name,
      token: token ? this.enrichTokenRow(token, row) : undefined,
    } as Appointment;
  }

  // --- TOKENS ---
  public async createToken(token: Token): Promise<Token> {
    const { error } = await supabase.from('tokens').insert({
      id: token.id,
      appointment_id: token.appointment_id,
      token_number: token.token_number,
      priority: token.priority,
      status: token.status,
      estimated_wait: token.estimated_wait,
      created_at: token.created_at,
      called_at: token.called_at || null,
      completed_at: token.completed_at || null,
    });
    if (error) throw error;
    return this.getTokenById(token.id) as Promise<Token>;
  }

  public async getTokenById(id: string): Promise<Token | null> {
    const { data, error } = await supabase
      .from('tokens')
      .select(`*, appointments ( *, profiles!appointments_patient_id_fkey ( name, phone ), doctors ( *, profiles!doctors_user_id_fkey ( name ), departments ( name ), hospitals ( name ) ) )`)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return this.enrichTokenRow(data, data.appointments);
  }

  public async getTokenByAppointmentId(appointmentId: string): Promise<Token | null> {
    const { data, error } = await supabase
      .from('tokens')
      .select(`*, appointments ( *, profiles!appointments_patient_id_fkey ( name, phone ), doctors ( *, profiles!doctors_user_id_fkey ( name ), departments ( name ), hospitals ( name ) ) )`)
      .eq('appointment_id', appointmentId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return this.enrichTokenRow(data, data.appointments);
  }

  public async getTokensByDoctor(doctorId: string, date?: string): Promise<Token[]> {
    let apptQuery = supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctorId);
    if (date) apptQuery = apptQuery.eq('appointment_date', date);

    const { data: appts, error: apptErr } = await apptQuery;
    if (apptErr) throw apptErr;
    if (!appts || appts.length === 0) return [];

    const apptIds = appts.map((a: any) => a.id);
    const { data, error } = await supabase
      .from('tokens')
      .select(`*, appointments ( *, profiles!appointments_patient_id_fkey ( name, phone ), doctors ( *, profiles!doctors_user_id_fkey ( name ), departments ( name ), hospitals ( name ) ) )`)
      .in('appointment_id', apptIds);
    if (error) throw error;
    return ((data || []) as any[]).map((t) => this.enrichTokenRow(t, t.appointments));
  }

  public async updateToken(id: string, updates: Partial<Token>): Promise<Token | null> {
    const { error } = await supabase
      .from('tokens')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
    return this.getTokenById(id);
  }

  public enrichToken(token: Token): Token {
    return token;
  }

  private enrichTokenRow(token: any, appt: any): Token {
    const patient = appt?.profiles;
    const doctor = appt?.doctors;
    const dept = doctor?.departments;
    const hosp = doctor?.hospitals;
    const doctorUser = doctor?.profiles;

    return {
      ...token,
      patient_name: patient?.name || 'Patient',
      patient_phone: patient?.phone,
      doctor_id: doctor?.id,
      doctor_name: doctorUser?.name || 'Doctor',
      department_name: dept?.name,
      hospital_name: hosp?.name,
      appointment_date: appt?.appointment_date,
      appointment_time: appt?.appointment_time,
      room_number: dept ? `Room ${100 + (parseInt(dept.id?.slice(-2) || '0', 16) % 300 || 204)}` : 'Room 204',
    } as Token;
  }

  // --- QUEUE EVENTS ---
  public async logQueueEvent(event: QueueEvent): Promise<QueueEvent> {
    const { error } = await supabase.from('queue_events').insert(event);
    if (error) console.error('logQueueEvent error:', error.message);
    return event;
  }

  // --- NOTIFICATIONS ---
  public async createNotification(notification: Notification): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();
    if (error) throw error;
    return data as Notification;
  }

  public async getNotificationsByUser(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Notification[];
  }

  public async markNotificationRead(id: string): Promise<Notification | null> {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Notification;
  }

  public async markAllNotificationsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId);
    if (error) throw error;
  }

  // Kept for compatibility with seed.ts
  public async resetData(data: any): Promise<void> {
    console.log('resetData called — data is in Supabase, no-op for local cache.');
  }

  public getRawData(): any {
    return {};
  }
}

export const store = new SupabaseStore();
