import React from 'react';
import { TokenStatus, PriorityLevel, AppointmentStatus } from '../../types/index.js';

interface StatusBadgeProps {
  status?: TokenStatus | AppointmentStatus | string;
  priority?: PriorityLevel | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, priority, className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3.5 py-1.5 text-sm',
  }[size];

  if (priority) {
    switch (priority) {
      case 'EMERGENCY':
        return (
          <span className={`inline-flex items-center font-bold uppercase rounded-full bg-rose-100 text-rose-800 border border-rose-300 animate-pulse ${sizeClasses} ${className}`}>
            <span className="w-2 h-2 mr-1.5 rounded-full bg-rose-600 animate-ping"></span>
            🚨 Emergency
          </span>
        );
      case 'PRIORITY':
        return (
          <span className={`inline-flex items-center font-semibold uppercase rounded-full bg-amber-100 text-amber-800 border border-amber-300 ${sizeClasses} ${className}`}>
            ⚡ Priority
          </span>
        );
      case 'NORMAL':
      default:
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses} ${className}`}>
            Normal
          </span>
        );
    }
  }

  switch (status) {
    case 'CALLED':
      return (
        <span className={`inline-flex items-center font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-300 shadow-sm animate-pulse ${sizeClasses} ${className}`}>
          <span className="w-2 h-2 mr-1.5 rounded-full bg-rose-600"></span>
          Now Calling
        </span>
      );
    case 'IN_CONSULTATION':
      return (
        <span className={`inline-flex items-center font-bold rounded-full bg-cyan-50 text-cyan-700 border border-cyan-300 ${sizeClasses} ${className}`}>
          <span className="w-2 h-2 mr-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
          In Consultation
        </span>
      );
    case 'WAITING':
      return (
        <span className={`inline-flex items-center font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-300 ${sizeClasses} ${className}`}>
          <span className="w-2 h-2 mr-1.5 rounded-full bg-amber-500"></span>
          Waiting in Queue
        </span>
      );
    case 'BOOKED':
      return (
        <span className={`inline-flex items-center font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses} ${className}`}>
          Booked
        </span>
      );
    case 'COMPLETED':
      return (
        <span className={`inline-flex items-center font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 ${sizeClasses} ${className}`}>
          ✓ Completed
        </span>
      );
    case 'NO_SHOW':
      return (
        <span className={`inline-flex items-center font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-300 ${sizeClasses} ${className}`}>
          ✕ No Show
        </span>
      );
    case 'CANCELLED':
      return (
        <span className={`inline-flex items-center font-medium rounded-full bg-red-50 text-red-600 border border-red-200 ${sizeClasses} ${className}`}>
          Cancelled
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center font-medium rounded-full bg-slate-100 text-slate-700 ${sizeClasses} ${className}`}>
          {status}
        </span>
      );
  }
};
