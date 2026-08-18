import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Layers,
  Hospital,
  Stethoscope,
  BarChart3,
  UserCheck,
  Clock,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  if (!user || user.role === 'PATIENT') return null;

  const doctorLinks = [
    { to: '/doctor/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/doctor/queue', label: 'Consultation Queue', icon: Layers },
    { to: '/doctor/patients', label: 'Patient Records', icon: Users },
    { to: '/doctor/profile', label: 'Doctor Schedule', icon: Settings },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Command Center', icon: LayoutDashboard },
    { to: '/admin/queues', label: 'Live Queue Monitor', icon: Layers },
    { to: '/admin/doctors', label: 'Doctors', icon: Stethoscope },
    { to: '/admin/hospitals', label: 'Hospitals', icon: Hospital },
    { to: '/admin/departments', label: 'Departments', icon: BarChart3 },
    { to: '/admin/patients', label: 'Patients Registry', icon: Users },
    { to: '/admin/appointments', label: 'All Appointments', icon: Calendar },
  ];

  const links = user.role === 'DOCTOR' ? doctorLinks : adminLinks;

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 space-y-6">
      <div className="px-3 py-2 bg-brand-50/70 border border-brand-100 rounded-xl">
        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700">Active Workspace</p>
        <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">
          {user.role === 'DOCTOR' ? (user.doctor?.specialization || 'Clinical Console') : 'Hospital Admin Portal'}
        </p>
      </div>

      <div className="space-y-1">
        <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Navigation</p>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </div>

      {user.role === 'DOCTOR' && user.doctor && (
        <div className="mt-auto p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span>Avg Consult Time:</span>
            <span className="font-bold text-slate-800">{user.doctor.average_consultation_time} min</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Room Number:</span>
            <span className="font-bold text-slate-800">Room 204</span>
          </div>
        </div>
      )}
    </aside>
  );
};
