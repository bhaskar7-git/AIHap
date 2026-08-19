import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase.js';
import { User, UserRole } from '../types/index.js';

export interface AuthRequest extends Request {
  user?: User;
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    return;
  }

  try {
    // Verify using Supabase Auth — works with both access_token and custom JWT
    const { data: { user: authUser }, error } = await supabase.auth.getUser(token);

    if (error || !authUser) {
      res.status(401).json({ success: false, message: 'Invalid or expired session.' });
      return;
    }

    // Fetch profile from profiles table
    let { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    // Auto-fallback: If user exists in Auth but not in profiles table, create the profile entry on-the-fly
    if (!profile) {
      const name = authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User';
      const role = (authUser.user_metadata?.role as UserRole) || 'PATIENT';
      const phone = authUser.user_metadata?.phone || '';

      const { data: newProfile, error: createErr } = await supabase
        .from('profiles')
        .upsert({
          id: authUser.id,
          name,
          phone,
          role,
          created_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

      if (!createErr && newProfile) {
        profile = newProfile;
      }
    }

    if (!profile) {
      res.status(401).json({ success: false, message: 'User profile not found.' });
      return;
    }

    req.user = {
      id: authUser.id,
      name: profile.name,
      email: authUser.email || '',
      phone: profile.phone || '',
      role: profile.role as UserRole,
      password_hash: '',
      created_at: profile.created_at,
    };

    next();
  } catch (err) {
    res.status(403).json({ success: false, message: 'Token verification failed.' });
  }
};

export const authorizeRoles = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized.' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to ${allowedRoles.join(', ')} roles.`,
      });
      return;
    }
    next();
  };
};
