import { Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { AuthRequest } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/auth/me
 * Returns the current authenticated user's profile.
 * Login/Register are handled directly by Supabase Auth on the frontend.
 */
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { password_hash: _, ...safeUser } = req.user;

    let doctorProfile = null;
    if (req.user.role === 'DOCTOR') {
      const { data } = await supabase
        .from('doctors')
        .select(`
          *,
          profiles!doctors_user_id_fkey ( name, phone ),
          departments ( name ),
          hospitals ( name )
        `)
        .eq('user_id', req.user.id)
        .maybeSingle();

      if (data) {
        doctorProfile = {
          ...data,
          user_name: (data as any).profiles?.name,
          department_name: (data as any).departments?.name,
          hospital_name: (data as any).hospitals?.name,
        };
      }
    }

    res.status(200).json({
      success: true,
      user: {
        ...safeUser,
        doctor: doctorProfile,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/auth/sync-profile
 * Called after frontend signUp to store extra profile data (name, phone, role)
 * and doctor details if registering as DOCTOR.
 */
export const syncProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ success: false, message: 'No token provided.' });
      return;
    }

    const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !authUser) {
      res.status(401).json({ success: false, message: 'Invalid token.' });
      return;
    }

    const {
      name,
      phone,
      role = 'PATIENT',
      specialization,
      qualification,
      hospital_id,
      department_id,
      average_consultation_time = 10,
    } = req.body;

    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert({
        id: authUser.id,
        name: name?.trim() || authUser.user_metadata?.name || 'User',
        phone: phone?.trim() || '',
        role: role,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    // If role is DOCTOR, also create doctor record
    if (role === 'DOCTOR') {
      let hospId = hospital_id;
      let deptId = department_id;

      // If not provided, fallback to first available hospital and department
      if (!hospId) {
        const { data: hosp } = await supabase.from('hospitals').select('id').limit(1).maybeSingle();
        hospId = hosp?.id || 'hosp-01';
      }
      if (!deptId) {
        const { data: dept } = await supabase.from('departments').select('id').eq('hospital_id', hospId).limit(1).maybeSingle();
        deptId = dept?.id || 'dept-01';
      }

      await supabase.from('doctors').upsert({
        id: `doc-${uuidv4().substring(0, 8)}`,
        user_id: authUser.id,
        hospital_id: hospId,
        department_id: deptId,
        specialization: specialization || 'General Practitioner',
        qualification: qualification || 'MBBS',
        average_consultation_time: Number(average_consultation_time) || 10,
        available: true,
        created_at: new Date().toISOString(),
      });
    }

    res.status(200).json({ success: true, profile });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Legacy stubs — frontend now calls Supabase Auth directly
export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  res.status(410).json({
    success: false,
    message: 'This endpoint is deprecated. Use Supabase Auth on the frontend.',
  });
};

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  res.status(410).json({
    success: false,
    message: 'This endpoint is deprecated. Use Supabase Auth on the frontend.',
  });
};
