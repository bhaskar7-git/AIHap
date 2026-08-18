import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Layers, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const MobileNav: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || user?.role !== 'PATIENT') return null;

  const items = [
    { to: '/patient/dashboard', label: 'Home', icon: LayoutDashboard },
    { to: '/patient/appointments', label: 'History', icon: Calendar },
    { to: '/patient/queue', label: 'Live Queue', icon: Layers },
    { to: '/patient/profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 flex items-center justify-around shadow-lg">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors ${
                isActive ? 'text-brand-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
};
