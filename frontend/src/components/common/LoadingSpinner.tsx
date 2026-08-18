import React from 'react';
import { Activity } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...', size = 'md' }) => {
  const sizeMap = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }[size];

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-3">
      <div className="relative flex items-center justify-center">
        <div className={`${sizeMap} rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin`}></div>
        <Activity className="absolute text-brand-600 w-1/2 h-1/2 animate-pulse" />
      </div>
      {message && <p className="text-sm font-medium text-slate-500 animate-pulse">{message}</p>}
    </div>
  );
};
