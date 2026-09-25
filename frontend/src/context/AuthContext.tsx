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

/**
 * Build a User object from Supabase auth user metadata as a fallback
 * when the backend API is unreachable.
 */
const buildUserFromSupabase = (authUser: any, role?: UserRole): User => ({
  id: authUser.id,
  name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
  email: authUser.email || '',
  phone: authUser.user_metadata?.phone || '',
  role: (authUser.user_metadata?.role as UserRole) || role || 'PATIENT',
  created_at: authUser.created_at || new Date().toISOString(),
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  /**
   * Tries to fetch the full profile from the backend.
   * Falls back to building the user from Supabase metadata if the backend is unreachable.
   */
  const hydrateUser = async (accessToken: string): Promise<User | null> => {
    try {
      const res = await api.get<{ success: boolean; user: User }>('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 8000,
      } as any);
      if (res.data?.success) return res.data.user;
    } catch (err: any) {
      // Backend unreachable or returned error — fall back to Supabase metadata
      console.warn('Backend /auth/me unreachable, using Supabase metadata as fallback:', err?.message || err?.code);
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser(accessToken);
        if (authUser) return buildUserFromSupabase(authUser);
      } catch (supaErr) {
        console.error('Supabase fallback also failed:', supaErr);
      }
    }
    return null;
  };

  useEffect(() => {
    // Restore session from Supabase on page load
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setToken(session.access_token);
        const hydrated = await hydrateUser(session.access_token);
        setUser(hydrated);
        if (hydrated) socketClient.joinUserRoom(hydrated.id);
      }
      setLoading(false);
    };

    init();

    // Listen to auth state changes (login/logout/refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setToken(session.access_token);
        const hydrated = await hydrateUser(session.access_token);
        setUser(hydrated);
        if (hydrated) socketClient.joinUserRoom(hydrated.id);
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      if (!data.session) throw new Error('No session returned from Supabase.');

      const accessToken = data.session.access_token;
      setToken(accessToken);

      // Try backend hydration, fall back to Supabase metadata
      let hydrated = await hydrateUser(accessToken);
      if (!hydrated) {
        if (data.user) {
          hydrated = buildUserFromSupabase(data.user);
        } else {
          throw new Error('Could not load user profile.');
        }
      }
      setUser(hydrated);
      socketClient.joinUserRoom(hydrated.id);
      return hydrated;
    } finally {
      setLoading(false);
    }
  };

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
      // 1. Create auth user in Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
            role: role || 'PATIENT',
          },
        },
      });
      if (error) throw new Error(error.message);
      if (!data.session) {
        // Email confirmation required — no session yet
        throw new Error(
          'Registration successful! Please check your email inbox to confirm your account, then sign in.'
        );
      }

      const accessToken = data.session.access_token;

      // 2. Sync profile to backend (non-fatal — backend may be offline)
      try {
        await api.post(
          '/auth/sync-profile',
          {
            name,
            phone,
            role: role || 'PATIENT',
            ...(extraData || {}),
          },
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 8000,
          } as any
        );
      } catch (syncErr: any) {
        // Backend unreachable — profile sync failed but Supabase auth registration succeeded
        console.warn('Backend sync-profile failed (non-fatal):', syncErr?.message || syncErr?.code);
      }

      // 3. Hydrate user (with fallback to Supabase metadata)
      setToken(accessToken);
      let hydrated = await hydrateUser(accessToken);
      if (!hydrated) {
        const fallbackAuthUser = data.user || {
          id: data.session.user.id,
          email,
          user_metadata: { name, phone, role: role || 'PATIENT' },
          created_at: new Date().toISOString(),
        };
        hydrated = buildUserFromSupabase(fallbackAuthUser, (role || 'PATIENT') as UserRole);
      }
      setUser(hydrated);
      socketClient.joinUserRoom(hydrated.id);
      return hydrated;
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async (role: UserRole): Promise<User> => {
    const credentials: Record<UserRole, { email: string; pass: string }> = {
      ADMIN:   { email: 'admin@smartqueue.com',   pass: 'Admin@123' },
      DOCTOR:  { email: 'doctor@smartqueue.com',  pass: 'Doctor@123' },
      PATIENT: { email: 'patient@smartqueue.com', pass: 'Patient@123' },
    };
    const cred = credentials[role];
    return login(cred.email, cred.pass);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setToken(null);
  };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const hydrated = await hydrateUser(session.access_token);
      if (hydrated) setUser(hydrated);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        demoLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
