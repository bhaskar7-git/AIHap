import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
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

  // ── Strategy 1: Try Supabase token verification ──────────────────────────
  try {
    const { supabase } = await import('../lib/supabase.js');
    const { data: { user: authUser }, error } = await supabase.auth.getUser(token);

    if (!error && authUser) {
      // Fetch profile from Supabase
      let { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();

      // Auto-create profile if missing
      if (!profile) {
        const name = authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User';
        const role = (authUser.user_metadata?.role as UserRole) || 'PATIENT';
        const phone = authUser.user_metadata?.phone || '';
        const { data: newProfile } = await supabase.from('profiles').upsert({
          id: authUser.id, name, phone, role, created_at: new Date().toISOString(),
        }).select().maybeSingle();
        if (newProfile) profile = newProfile;
      }

      if (profile) {
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
        return;
      }
    }
  } catch (supaErr) {
    // Supabase unavailable — fall through to local JWT check
    console.warn('[Auth middleware] Supabase token check failed, trying local JWT');
  }

  // ── Strategy 2: Verify as local JWT (issued by our backend) ─────────────
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    const userId: string = decoded.sub || decoded.id;
    const role: UserRole = (decoded.role as UserRole) || 'PATIENT';

    if (!userId) {
      res.status(401).json({ success: false, message: 'Invalid token payload.' });
      return;
    }

    // Try to enrich from Supabase profile (best-effort)
    let name = decoded.name || 'User';
    let email = decoded.email || '';
    let phone = decoded.phone || '';
    let created_at = decoded.iat ? new Date(decoded.iat * 1000).toISOString() : new Date().toISOString();

    try {
      const { supabase } = await import('../lib/supabase.js');
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (profile) { name = profile.name; phone = profile.phone; created_at = profile.created_at; }
    } catch { /* offline — use decoded data */ }

    req.user = { id: userId, name, email, phone, role, password_hash: '', created_at };
    next();
    return;
  } catch (jwtErr) {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

export const authorizeRoles = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) { res.status(401).json({ success: false, message: 'Unauthorized.' }); return; }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: `Forbidden: Access restricted to ${allowedRoles.join(', ')} roles.` });
      return;
    }
    next();
  };
};
