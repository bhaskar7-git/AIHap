import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 py-16 text-center">
      <div className="max-w-md space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-brand-100 text-brand-700 mx-auto flex items-center justify-center shadow-lg">
          <Activity className="w-8 h-8 animate-pulse" />
        </div>
        <div className="space-y-2">
          <h1 className="text-6xl font-black text-slate-900 font-mono">404</h1>
          <h2 className="text-xl font-bold text-slate-800">Page Not Found</h2>
          <p className="text-sm text-slate-500">
            The page or queue console you are looking for does not exist or has moved.
          </p>
        </div>
        <div className="pt-2 flex justify-center gap-3">
          <Link
            to="/"
            className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-sm"
          >
            <Home className="w-4 h-4" /> Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
};
