import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  LogOut,
  User as UserIcon,
  Calendar,
  Layers,
  Hospital,
  Stethoscope,
  Menu,
  X,
  QrCode,
  Sparkles,
  ShieldCheck,
  Bot,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { NotificationBell } from '../common/NotificationBell.js';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-cyan-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-brand-900 to-cyan-600 bg-clip-text text-transparent">
                  SmartQueue
                </span>
                <span className="hidden sm:inline-block ml-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 rounded-full border border-brand-200">
                  Health OS
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links based on Role */}
            <nav className="hidden md:flex ml-10 space-x-1 lg:space-x-4">
              {isAuthenticated && user?.role === 'PATIENT' && (
                <>
                  <Link
                    to="/patient/dashboard"
                    className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/patient/book-token"
                    className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4 text-brand-500" />
                    Book Token
                  </Link>
                  {/* Aria AI Chatbot — highlighted */}
                  <Link
                    to="/patient/book-appointment"
                    className="px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-cyan-500 hover:from-brand-700 hover:to-cyan-600 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-1.5"
                  >
                    <Bot className="w-4 h-4" />
                    Aria AI
                  </Link>
                  <Link
                    to="/patient/queue"
                    className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Layers className="w-4 h-4 text-cyan-500" />
                    Live Queue
                  </Link>
                  <Link
                    to="/patient/doctors"
                    className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Doctors
                  </Link>
                  <Link
                    to="/patient/appointments"
                    className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    My History
                  </Link>
                </>
              )}

              {isAuthenticated && user?.role === 'DOCTOR' && (
                <>
                  <Link
                    to="/doctor/dashboard"
                    className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Doctor Console
                  </Link>
                  <Link
                    to="/doctor/queue"
                    className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Layers className="w-4 h-4 text-brand-500" />
                    Live Room Queue
                  </Link>
                  <Link
                    to="/doctor/patients"
                    className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Patient Log
                  </Link>
                </>
              )}

              {isAuthenticated && user?.role === 'ADMIN' && (
                <>
                  <Link
                    to="/admin/dashboard"
                    className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Command Center
                  </Link>
                  <Link
                    to="/admin/queues"
                    className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Queue Monitor
                  </Link>
                  <Link
                    to="/admin/doctors"
                    className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Doctors
                  </Link>
                  <Link
                    to="/admin/hospitals"
                    className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Hospitals
                  </Link>
                </>
              )}

              {!isAuthenticated && (
                <>
                  <Link
                    to="/patient/hospitals"
                    className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Find Hospitals
                  </Link>
                  <Link
                    to="/patient/doctors"
                    className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Doctors
                  </Link>
                  <Link
                    to="/qr-register"
                    className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <QrCode className="w-4 h-4 text-brand-500" />
                    Hospital QR Kiosk
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <NotificationBell />

                <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200">
                  <div className="w-9 h-9 rounded-full bg-brand-100 border border-brand-300 text-brand-800 flex items-center justify-center font-bold text-sm">
                    {user?.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-slate-800 leading-none">{user?.name}</p>
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                      {user?.role}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/qr-register"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <QrCode className="w-4 h-4" />
                  Lobby QR
                </Link>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-brand-600 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm hover:shadow transition-all"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile menu toggle button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-6 space-y-2 animate-fade-in shadow-xl">
          {isAuthenticated ? (
            <>
              <div className="py-2 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center font-bold">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-900">{user?.name}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
              </div>

              {user?.role === 'PATIENT' && (
                <>
                  <Link
                    to="/patient/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/patient/book-token"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    Book Digital Token
                  </Link>
                  {/* Aria AI — highlighted in mobile too */}
                  <Link
                    to="/patient/book-appointment"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-cyan-500 rounded-xl shadow-sm"
                  >
                    <Bot className="w-4 h-4" />
                    Aria AI — Multilingual Assistant
                  </Link>
                  <Link
                    to="/patient/queue"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    Live Queue Tracker
                  </Link>
                  <Link
                    to="/patient/appointments"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    Appointment History
                  </Link>
                  <Link
                    to="/patient/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    Profile
                  </Link>
                </>
              )}

              {user?.role === 'DOCTOR' && (
                <>
                  <Link
                    to="/doctor/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    Doctor Console
                  </Link>
                  <Link
                    to="/doctor/queue"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    Live Room Queue
                  </Link>
                  <Link
                    to="/doctor/patients"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    Patient Records
                  </Link>
                  <Link
                    to="/doctor/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    Doctor Profile & Availability
                  </Link>
                </>
              )}

              {user?.role === 'ADMIN' && (
                <>
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    Admin Dashboard
                  </Link>
                  <Link
                    to="/admin/queues"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    Queue Monitor
                  </Link>
                  <Link
                    to="/admin/doctors"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    Manage Doctors
                  </Link>
                  <Link
                    to="/admin/hospitals"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    Manage Hospitals
                  </Link>
                </>
              )}

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg"
              >
                Sign Out
              </button>
            </>
          ) : (
            <div className="space-y-2 pt-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center px-4 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-lg"
              >
                Register as Patient
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
