import React from 'react';
import { User, Phone, Mail, Shield, Bell, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Patient Profile</h1>
        <p className="text-xs sm:text-sm text-slate-500">Manage personal identification, contact details and notifications</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-600 text-white flex items-center justify-center font-bold text-2xl shadow-md">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
            <p className="text-xs text-brand-600 font-semibold uppercase tracking-wider">Registered Patient</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-500" /> Email Address
            </span>
            <p className="font-semibold text-slate-800">{user?.email}</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-500" /> Phone Number (SMS / WhatsApp)
            </span>
            <p className="font-semibold text-slate-800">{user?.phone}</p>
          </div>
        </div>

        {/* Notifications Preference (Fulfilling Section 16: SMS/WhatsApp demo abstraction) */}
        <div className="p-5 bg-cyan-50/60 border border-cyan-100 rounded-2xl space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-cyan-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-cyan-600" />
            Notification Channels
          </h4>
          <p className="text-xs text-slate-600">
            Real-time notifications are enabled for in-app popups, WebSocket broadcasts, and connected SMS/WhatsApp mock channels.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700 pt-1">
            <span className="flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> In-App Web Alerts
            </span>
            <span className="flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Real-Time Sound & Toasts
            </span>
            <span className="flex items-center gap-1 text-cyan-700">
              <CheckCircle2 className="w-4 h-4 text-cyan-500" /> SMS / WhatsApp Ready
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
