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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const hydrateUser = async (accessToken: string): Promise<User | null> => {
    try {
      const res = await api.get<{ success: boolean; user: User }>('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.data?.success) return res.data.user;
    } catch (err: any) {
      console.error('hydrateUser error:', err?.response?.data || err?.message || err);
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
      const hydrated = await hydrateUser(accessToken);
      if (!hydrated) throw new Error('Could not load user profile.');
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
      // 1. Create auth user
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
        throw new Error('Registration successful! Please check your email inbox to confirm your account or sign in directly.');
      }

      const accessToken = data.session.access_token;

      // 2. Sync profile to backend (creates the profiles / doctors row)
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
        }
      );

      // 3. Hydrate user
      setToken(accessToken);
      const hydrated = await hydrateUser(accessToken);
      if (!hydrated) throw new Error('Could not load user profile after registration.');
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
