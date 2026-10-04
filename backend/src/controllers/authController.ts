import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import { AuthRequest } from '../middleware/auth.js';

// ─── In-memory user store (fallback when Supabase is paused) ─────────────────
// On Render, this persists as long as the server is running.
// All users are hashed with bcrypt — passwords are never stored in plain text.
interface LocalUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  password_hash: string;
  created_at: string;
  // Doctor-specific
  specialization?: string;
  qualification?: string;
  hospital_name?: string;
  department_name?: string;
  average_consultation_time?: number;
}

const localUsers: Map<string, LocalUser> = new Map();

// ─── Seed demo users (always available, even without Supabase) ────────────────
const DEMO_SEEDS = [
  { id: 'demo-patient-01', name: 'Demo Patient',  email: 'patient@smartqueue.com', phone: '9000000001', role: 'PATIENT', password: 'Patient@123' },
  { id: 'demo-doctor-01',  name: 'Demo Doctor',   email: 'doctor@smartqueue.com',  phone: '9000000002', role: 'DOCTOR',  password: 'Doctor@123',  specialization: 'General Physician', qualification: 'MBBS' },
  { id: 'demo-admin-01',   name: 'Demo Admin',    email: 'admin@smartqueue.com',   phone: '9000000003', role: 'ADMIN',   password: 'Admin@123' },
];

(async () => {
  for (const seed of DEMO_SEEDS) {
    const password_hash = await bcrypt.hash(seed.password, 10);
    localUsers.set(seed.id, {
      id: seed.id, name: seed.name, email: seed.email, phone: seed.phone,
      role: seed.role, password_hash, created_at: new Date().toISOString(),
      specialization: (seed as any).specialization,
      qualification: (seed as any).qualification,
    });
  }
  console.log('✅ Demo users seeded into local auth store (patient/doctor/admin).');
})();


const signToken = (userId: string, role: string): string =>
  jwt.sign({ sub: userId, role }, config.JWT_SECRET, { expiresIn: '7d' });

const safeUser = (u: LocalUser) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  created_at: u.created_at,
});

// ─── Try Supabase first, fall back to local store ─────────────────────────────

async function trySupabaseRegister(body: any): Promise<{ token: string; user: LocalUser } | null> {
  try {
    // Dynamically import supabase so if the module itself throws, we catch it
    const { supabase } = await import('../lib/supabase.js');

    // Check if email already exists in Supabase before creating
    const { data: existing } = await supabase.auth.admin.listUsers();
    const alreadyExists = existing?.users?.some(
      (u: any) => u.email?.toLowerCase() === body.email?.toLowerCase()
    );
    if (alreadyExists) {
      // Throw so the register handler catches and returns 409
      throw Object.assign(new Error('An account with this email already exists.'), { isDuplicate: true });
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { name: body.name, phone: body.phone, role: body.role || 'PATIENT' },
    });

    // Duplicate or other Supabase error
    if (error) {
      const msg = error.message || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered') || (error as any).status === 422) {
        throw Object.assign(new Error('An account with this email already exists.'), { isDuplicate: true });
      }
      console.warn('[Auth] Supabase createUser error:', msg);
      return null;
    }
    if (!data?.user) return null;

    // Upsert profile
    await supabase.from('profiles').upsert({
      id: data.user.id,
      name: body.name?.trim(),
      phone: body.phone?.replace(/\D/g, '').slice(-10) || '',
      role: body.role || 'PATIENT',
      created_at: new Date().toISOString(),
    });

    // If DOCTOR, create doctor record
    if (body.role === 'DOCTOR') {
      await upsertDoctorSupabase(supabase, data.user.id, body);
    }

    const token = signToken(data.user.id, body.role || 'PATIENT');
    const user: LocalUser = {
      id: data.user.id,
      name: body.name,
      email: body.email,
      phone: body.phone,
      role: body.role || 'PATIENT',
      password_hash: '',
      created_at: data.user.created_at || new Date().toISOString(),
    };
    return { token, user };
  } catch (err: any) {
    // Re-throw duplicate errors so the register handler sends 409
    if (err?.isDuplicate) throw err;
    console.warn('[Auth] Supabase register failed, using local store:', err?.message);
    return null;
  }
}

async function upsertDoctorSupabase(supabase: any, userId: string, body: any) {
  try {
    let hospId: string;
    if (body.hospital_name) {
      const { data: existHosp } = await supabase.from('hospitals').select('id').ilike('name', body.hospital_name).maybeSingle();
      if (existHosp) {
        hospId = existHosp.id;
      } else {
        hospId = `hosp-${uuidv4().substring(0, 8)}`;
        await supabase.from('hospitals').insert({ id: hospId, name: body.hospital_name, address: 'Healthcare Campus', city: 'Metro City', phone: body.phone || '', created_at: new Date().toISOString() });
      }
    } else {
      const { data: h } = await supabase.from('hospitals').select('id').limit(1).maybeSingle();
      hospId = h?.id || 'hosp-01';
    }

    let deptId: string;
    if (body.department_name) {
      const { data: existDept } = await supabase.from('departments').select('id').eq('hospital_id', hospId).ilike('name', body.department_name).maybeSingle();
      if (existDept) {
        deptId = existDept.id;
      } else {
        deptId = `dept-${uuidv4().substring(0, 8)}`;
        await supabase.from('departments').insert({ id: deptId, hospital_id: hospId, name: body.department_name, description: `${body.department_name} Department`, created_at: new Date().toISOString() });
      }
    } else {
      const { data: d } = await supabase.from('departments').select('id').eq('hospital_id', hospId).limit(1).maybeSingle();
      deptId = d?.id || 'dept-01';
    }

    await supabase.from('doctors').upsert({
      id: `doc-${uuidv4().substring(0, 8)}`,
      user_id: userId,
      hospital_id: hospId,
      department_id: deptId,
      specialization: body.specialization || 'General Physician',
      qualification: body.qualification || 'MBBS',
      average_consultation_time: Number(body.average_consultation_time) || 10,
      available: true,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[Auth] Doctor upsert failed:', (err as any)?.message);
  }
}

async function trySupabaseLogin(email: string, password: string): Promise<{ token: string; user: LocalUser } | null> {
  try {
    const { supabase } = await import('../lib/supabase.js');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data?.user) return null;

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
    const token = signToken(data.user.id, profile?.role || 'PATIENT');
    const user: LocalUser = {
      id: data.user.id,
      name: profile?.name || data.user.user_metadata?.name || email.split('@')[0],
      email: data.user.email || email,
      phone: profile?.phone || '',
      role: profile?.role || 'PATIENT',
      password_hash: '',
      created_at: profile?.created_at || new Date().toISOString(),
    };
    return { token, user };
  } catch (err) {
    console.warn('[Auth] Supabase login failed, using local store:', (err as any)?.message);
    return null;
  }
}

// ─── PUBLIC ENDPOINTS ──────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Tries Supabase first; falls back to local in-memory store if Supabase is unavailable.
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, password, role = 'PATIENT', ...extra } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Name, email and password are required.' });
      return;
    }

    // Check duplicate email (local store)
    for (const u of localUsers.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) {
        res.status(409).json({ success: false, message: 'An account with this email already exists.' });
        return;
      }
    }

    // Try Supabase
    try {
      const supaResult = await trySupabaseRegister({ name, email, phone, password, role, ...extra });
      if (supaResult) {
        res.status(201).json({ success: true, token: supaResult.token, user: safeUser(supaResult.user), message: 'Account created successfully.' });
        return;
      }
    } catch (supaErr: any) {
      if (supaErr?.isDuplicate) {
        res.status(409).json({ success: false, message: supaErr.message });
        return;
      }
      // Other Supabase errors — fall through to local store
    }

    // Fallback: local in-memory store
    const id = uuidv4();
    const password_hash = await bcrypt.hash(password, 10);
    const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : '';
    const newUser: LocalUser = {
      id, name: name.trim(), email: email.toLowerCase().trim(), phone: cleanPhone,
      role, password_hash, created_at: new Date().toISOString(),
      specialization: extra.specialization, qualification: extra.qualification,
      hospital_name: extra.hospital_name, department_name: extra.department_name,
      average_consultation_time: extra.average_consultation_time,
    };
    localUsers.set(id, newUser);

    const token = signToken(id, role);
    console.log(`[Auth] Local register: ${email} (${role})`);
    res.status(201).json({ success: true, token, user: safeUser(newUser), message: 'Account created successfully (offline mode).' });
  } catch (err: any) {
    console.error('[Auth] register error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Registration failed.' });
  }
};

/**
 * POST /api/auth/login
 * Checks local store first (instant), then Supabase for existing users not in local store.
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    // ── 1. Check local store first (instant — no network needed) ──────────
    let found: LocalUser | undefined;
    for (const u of localUsers.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) { found = u; break; }
    }
    if (found) {
      const valid = await bcrypt.compare(password, found.password_hash);
      if (!valid) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }
      const token = signToken(found.id, found.role);
      console.log(`[Auth] Local login: ${email} (${found.role})`);
      res.status(200).json({ success: true, token, user: safeUser(found), message: 'Login successful.' });
      return;
    }

    // ── 2. Not in local store → try Supabase (for pre-existing users) ──────
    const supaResult = await trySupabaseLogin(email, password);
    if (supaResult) {
      // Cache in local store so next login is instant
      localUsers.set(supaResult.user.id, { ...supaResult.user, password_hash: '' });
      res.status(200).json({ success: true, token: supaResult.token, user: safeUser(supaResult.user), message: 'Login successful.' });
      return;
    }

    // ── 3. Not found anywhere ───────────────────────────────────────────────
    res.status(401).json({ success: false, message: 'Invalid email or password. If you registered before, please try resetting your password.' });
  } catch (err: any) {
    console.error('[Auth] login error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Login failed.' });
  }
};


/**
 * GET /api/auth/me
 * Returns user profile from JWT (works with both Supabase and local tokens).
 */
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }
    res.status(200).json({ success: true, user: req.user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/auth/sync-profile
 * Called after Supabase signUp to store extra profile data.
 * This is a legacy endpoint kept for compatibility; register now handles everything.
 */
export const syncProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ success: false, message: 'No token provided.' });
      return;
    }

    // Try to handle via Supabase (original flow)
    try {
      const { supabase } = await import('../lib/supabase.js');
      const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(token);
      if (!authErr && authUser) {
        const { name, phone, role = 'PATIENT', ...extra } = req.body;
        const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : '';
        await supabase.from('profiles').upsert({ id: authUser.id, name: name?.trim(), phone: cleanPhone, role, created_at: new Date().toISOString() });
        if (role === 'DOCTOR') await upsertDoctorSupabase(supabase, authUser.id, { phone: cleanPhone, ...extra });
        res.status(200).json({ success: true, message: 'Profile synced.' });
        return;
      }
    } catch (supaErr) {
      console.warn('[Auth] sync-profile Supabase failed:', (supaErr as any)?.message);
    }

    // Fallback: decode local JWT and update local store
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as any;
      const userId = decoded.sub;
      const existing = localUsers.get(userId);
      if (existing) {
        const { name, phone, role } = req.body;
        if (name) existing.name = name.trim();
        if (phone) existing.phone = String(phone).replace(/\D/g, '').slice(-10);
        if (role) existing.role = role;
        localUsers.set(userId, existing);
      }
      res.status(200).json({ success: true, message: 'Profile synced (local).' });
    } catch {
      res.status(200).json({ success: true, message: 'Profile sync skipped (token unrecognized).' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
