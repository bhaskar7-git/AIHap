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
      hospital_name,
      department_id,
      department_name,
      average_consultation_time = 10,
    } = req.body;

    // Clean phone number (keep digits only, max 10 digits)
    const cleanedPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : '';

    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert({
        id: authUser.id,
        name: name?.trim() || authUser.user_metadata?.name || 'User',
        phone: cleanedPhone,
        role: role,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    // If role is DOCTOR, create or link doctor record with hospital and department
    if (role === 'DOCTOR') {
      let finalHospId = hospital_id;
      let finalDeptId = department_id;

      // 1. Resolve Hospital
      if (!finalHospId && hospital_name) {
        // Try to find existing hospital by name
        const { data: existingHosp } = await supabase
          .from('hospitals')
          .select('id')
          .ilike('name', hospital_name.trim())
          .maybeSingle();

        if (existingHosp) {
          finalHospId = existingHosp.id;
        } else {
          // Create new hospital
          finalHospId = `hosp-${uuidv4().substring(0, 8)}`;
          await supabase.from('hospitals').insert({
            id: finalHospId,
            name: hospital_name.trim(),
            address: 'Main Healthcare Campus',
            city: 'Metro City',
            phone: cleanedPhone || '+91 80 4455 6677',
            created_at: new Date().toISOString(),
          });
        }
      } else if (!finalHospId) {
        const { data: hosp } = await supabase.from('hospitals').select('id').limit(1).maybeSingle();
        finalHospId = hosp?.id || 'hosp-01';
      }

      // 2. Resolve Department
      if (!finalDeptId && department_name) {
        const { data: existingDept } = await supabase
          .from('departments')
          .select('id')
          .eq('hospital_id', finalHospId)
          .ilike('name', department_name.trim())
          .maybeSingle();

        if (existingDept) {
          finalDeptId = existingDept.id;
        } else {
          finalDeptId = `dept-${uuidv4().substring(0, 8)}`;
          await supabase.from('departments').insert({
            id: finalDeptId,
            hospital_id: finalHospId,
            name: department_name.trim(),
            description: `${department_name.trim()} Department`,
            created_at: new Date().toISOString(),
          });
        }
      } else if (!finalDeptId) {
        const { data: dept } = await supabase
          .from('departments')
          .select('id')
          .eq('hospital_id', finalHospId)
          .limit(1)
          .maybeSingle();
        finalDeptId = dept?.id || 'dept-01';
      }

      await supabase.from('doctors').upsert({
        id: `doc-${uuidv4().substring(0, 8)}`,
        user_id: authUser.id,
        hospital_id: finalHospId,
        department_id: finalDeptId,
        specialization: specialization || 'General Physician',
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
