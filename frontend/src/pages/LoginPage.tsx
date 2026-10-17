import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Activity, Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff,
  ShieldCheck, Stethoscope, User, Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { UserRole } from '../types/index.js';

const DEMO_ACCOUNTS: { role: UserRole; label: string; email: string; pass: string; color: string; icon: React.ReactNode }[] = [
  {
    role: 'PATIENT',
    label: 'Patient',
    email: 'patient@smartqueue.com',
    pass: 'Patient@123',
    color: 'from-sky-500 to-cyan-400',
    icon: <User className="w-3.5 h-3.5" />,
  },
  {
    role: 'DOCTOR',
    label: 'Doctor',
    email: 'doctor@smartqueue.com',
    pass: 'Doctor@123',
    color: 'from-emerald-500 to-teal-400',
    icon: <Stethoscope className="w-3.5 h-3.5" />,
  },
  {
    role: 'ADMIN',
    label: 'Admin',
    email: 'admin@smartqueue.com',
    pass: 'Admin@123',
    color: 'from-violet-600 to-purple-500',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
  },
];

export const LoginPage: React.FC = () => {
  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = new URLSearchParams(location.search).get('redirect') || null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redirectByRole = (role: UserRole) => {
    if (redirectTo) { navigate(redirectTo); return; }
    if (role === 'PATIENT') navigate('/patient/dashboard');
    else if (role === 'DOCTOR') navigate('/doctor/dashboard');
    else if (role === 'ADMIN') navigate('/admin/dashboard');
    else navigate('/');
  };

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const loggedInUser = await login(email, password);
      redirectByRole(loggedInUser.role);
    } catch (err: any) {
      setError(err?.message || err?.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: UserRole) => {
    try {
      setDemoLoading(role);
      setError(null);
      const loggedInUser = await demoLogin(role);
      redirectByRole(loggedInUser.role);
    } catch (err: any) {
      setError(err?.message || 'Demo login failed. Please try manual login.');
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-500 text-white mx-auto flex items-center justify-center shadow-lg">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Sign in to SmartQueue</h2>
          <p className="text-xs sm:text-sm text-slate-500">Access your appointments, live token queue or medical dashboard</p>
        </div>

        {/* 1-Click Demo Login */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-3xl border border-slate-700 shadow-lg space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">1-Click Demo Login</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                onClick={() => handleDemoLogin(acc.role)}
                disabled={!!demoLoading || loading}
                className={`relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-gradient-to-br ${acc.color} text-white font-bold text-xs shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-50`}
              >
                {demoLoading === acc.role ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  acc.icon
                )}
                <span>{acc.label}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 text-center">
            Tap any role to instantly log in with pre-seeded demo credentials
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 font-medium">or sign in manually</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Login Form */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* autoComplete="off" on form prevents browser from pre-filling saved credentials */}
          <form onSubmit={handleStandardLogin} className="space-y-4" autoComplete="off">
            {/* Hidden dummy inputs trick browsers that ignore autoComplete="off" */}
            <input type="text" name="fake_user" style={{ display: 'none' }} readOnly />
            <input type="password" name="fake_pass" style={{ display: 'none' }} readOnly />

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="off"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Forgot password link */}
            <div className="flex justify-end -mt-1">
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading || !!demoLoading}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-brand-600 hover:text-brand-700">
              Register here
            </Link>
          </div>
        </div>

        {/* Demo credentials hint */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Demo Credentials</p>
          <div className="space-y-1.5">
            {DEMO_ACCOUNTS.map((acc) => (
              <div key={acc.role} className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">{acc.label}</span>
                <code className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg font-mono">{acc.email}</code>
              </div>
            ))}
            <p className="text-[10px] text-slate-400 pt-1">All demo accounts use role-specific passwords (e.g. <code className="bg-slate-100 px-1 rounded">Admin@123</code>)</p>
          </div>
        </div>
      </div>
    </div>
  );
};
