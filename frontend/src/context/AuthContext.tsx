import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types/index.js';
import { supabase } from '../lib/supabase.js';
import { api } from '../services/api.js';
import { socketClient } from '../services/socket.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, phone: string, password: string, role?: string, extraData?: any) => Promise<User>;
  demoLogin: (role: UserRole) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Build a User from raw data (backend response or Supabase metadata) */
const buildUser = (data: any, role?: UserRole): User => ({
  id: data.id,
  name: data.name || data.user_metadata?.name || data.email?.split('@')[0] || 'User',
  email: data.email || '',
  phone: data.phone || data.user_metadata?.phone || '',
  role: (data.role as UserRole) || (data.user_metadata?.role as UserRole) || role || 'PATIENT',
  created_at: data.created_at || new Date().toISOString(),
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // ── Restore session on page load ──────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      // Check if we have a backend-issued JWT in localStorage
      const savedToken = localStorage.getItem('sq_token');
      const savedUser = localStorage.getItem('sq_user');
      if (savedToken && savedUser) {
        try {
          const parsed = JSON.parse(savedUser) as User;
          setToken(savedToken);
          setUser(parsed);
          socketClient.joinUserRoom(parsed.id);
          setLoading(false);
          return;
        } catch { /* bad data, clear it */ }
      }

      // Fall back: try Supabase session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setToken(session.access_token);
          const hydrated = await hydrateFromBackend(session.access_token);
          if (hydrated) { setUser(hydrated); socketClient.joinUserRoom(hydrated.id); }
        }
      } catch { /* Supabase unavailable */ }
      setLoading(false);
    };
    init();

    // Listen for Supabase auth state changes
    let unsub: (() => void) | undefined;
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session && !localStorage.getItem('sq_token')) {
          setToken(session.access_token);
          const hydrated = await hydrateFromBackend(session.access_token);
          if (hydrated) { setUser(hydrated); socketClient.joinUserRoom(hydrated.id); }
        }
        setLoading(false);
      });
      unsub = () => subscription.unsubscribe();
    } catch { /* Supabase offline */ }
    return () => unsub?.();
  }, []);

  /** Try to get the full user profile from the backend /auth/me */
  const hydrateFromBackend = async (accessToken: string): Promise<User | null> => {
    try {
      const res = await api.get<{ success: boolean; user: User }>('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 8000,
      } as any);
      if (res.data?.success) return res.data.user;
    } catch (err: any) {
      console.warn('[Auth] /auth/me failed:', err?.message);
      // Try to get from Supabase metadata
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser(accessToken);
        if (authUser) return buildUser(authUser);
      } catch { /* offline */ }
    }
    return null;
  };

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      // Strategy 1: Backend login (works even when Supabase is paused)
      try {
        const res = await api.post<{ success: boolean; token: string; user: User }>(
          '/auth/login', { email, password }, { timeout: 10000 } as any
        );
        if (res.data?.success && res.data.token) {
          const loggedUser = buildUser(res.data.user);
          setToken(res.data.token);
          setUser(loggedUser);
          localStorage.setItem('sq_token', res.data.token);
          localStorage.setItem('sq_user', JSON.stringify(loggedUser));
          socketClient.joinUserRoom(loggedUser.id);
          return loggedUser;
        }
      } catch (backendErr: any) {
        // If it's a 401 (wrong password), propagate that error
        if (backendErr?.response?.status === 401) {
          throw new Error(backendErr.response.data?.message || 'Invalid email or password.');
        }
        console.warn('[Auth] Backend login failed, trying Supabase:', backendErr?.message);
      }

      // Strategy 2: Supabase direct
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      if (!data.session) throw new Error('Login failed. No session returned.');

      const accessToken = data.session.access_token;
      setToken(accessToken);
      const hydrated = await hydrateFromBackend(accessToken) || buildUser(data.user);
      setUser(hydrated);
      socketClient.joinUserRoom(hydrated.id);
      return hydrated;
    } finally {
      setLoading(false);
    }
  };

  // ── REGISTER ──────────────────────────────────────────────────────────────
  const register = async (
    name: string,
    email: string,
    phone: string,
    password: string,
    role?: string,
    extraData?: any
  ): Promise<User> => {
    setLoading(true);
    try {
      // Strategy 1: Backend register (Supabase-first with local fallback built-in)
      try {
        const res = await api.post<{ success: boolean; token: string; user: User }>(
          '/auth/register',
          { name, email, phone, password, role: role || 'PATIENT', ...(extraData || {}) },
          { timeout: 15000 } as any
        );
        if (res.data?.success && res.data.token) {
          const newUser = buildUser(res.data.user, (role || 'PATIENT') as UserRole);
          setToken(res.data.token);
          setUser(newUser);
          localStorage.setItem('sq_token', res.data.token);
          localStorage.setItem('sq_user', JSON.stringify(newUser));
          socketClient.joinUserRoom(newUser.id);
          return newUser;
        }
      } catch (backendErr: any) {
        // Propagate real errors (e.g., duplicate email)
        if (backendErr?.response?.status === 409) {
          throw new Error(backendErr.response.data?.message || 'An account with this email already exists.');
        }
        if (backendErr?.response?.status === 400) {
          throw new Error(backendErr.response.data?.message || 'Invalid registration data.');
        }
        console.warn('[Auth] Backend register failed, trying Supabase directly:', backendErr?.message);
      }

      // Strategy 2: Supabase direct (if backend itself is down)
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { name, phone, role: role || 'PATIENT' } },
      });
      if (error) throw new Error(error.message);
      if (!data.session) {
        throw new Error('Registration successful! Please check your email to confirm your account, then sign in.');
      }

      const accessToken = data.session.access_token;
      setToken(accessToken);
      const hydrated = await hydrateFromBackend(accessToken) || buildUser(data.user || { id: data.session.user.id, email, user_metadata: { name, phone, role: role || 'PATIENT' } }, (role || 'PATIENT') as UserRole);
      setUser(hydrated);
      socketClient.joinUserRoom(hydrated.id);
      return hydrated;
    } finally {
      setLoading(false);
    }
  };

  // ── DEMO LOGIN ────────────────────────────────────────────────────────────
  const demoLogin = async (role: UserRole): Promise<User> => {
    const creds: Record<UserRole, { email: string; pass: string }> = {
      ADMIN:   { email: 'admin@smartqueue.com',   pass: 'Admin@123' },
      DOCTOR:  { email: 'doctor@smartqueue.com',  pass: 'Doctor@123' },
      PATIENT: { email: 'patient@smartqueue.com', pass: 'Patient@123' },
    };
    return login(creds[role].email, creds[role].pass);
  };

  // ── LOGOUT ────────────────────────────────────────────────────────────────
  const logout = async () => {
    localStorage.removeItem('sq_token');
    localStorage.removeItem('sq_user');
    try { await supabase.auth.signOut(); } catch { /* offline */ }
    setUser(null);
    setToken(null);
  };

  // ── REFRESH ───────────────────────────────────────────────────────────────
  const refreshUser = async () => {
    const t = localStorage.getItem('sq_token') || token;
    if (t) {
      const hydrated = await hydrateFromBackend(t);
      if (hydrated) setUser(hydrated);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated: !!user && !!token, login, register, demoLogin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
