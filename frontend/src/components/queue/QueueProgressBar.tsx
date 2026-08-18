import React from 'react';

interface QueueProgressBarProps {
  currentStep: number;
  totalTokens: number;
  yourTokenNumber?: string;
  currentTokenNumber?: string;
}

export const QueueProgressBar: React.FC<QueueProgressBarProps> = ({
  currentStep,
  totalTokens,
  yourTokenNumber,
  currentTokenNumber,
}) => {
  const percentage = Math.min(100, Math.max(5, Math.round((currentStep / Math.max(1, totalTokens)) * 100)));

  return (
    <div className="w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-slate-500">
          Serving: <strong className="text-brand-700 font-bold">{currentTokenNumber || 'None'}</strong>
        </span>
        <span className="text-slate-500">
          Your Token: <strong className="text-slate-800 font-bold">{yourTokenNumber || 'Pending'}</strong>
        </span>
      </div>

      <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200">
        <div
          className="bg-gradient-to-r from-brand-500 via-cyan-500 to-emerald-500 h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-1"
          style={{ width: `${percentage}%` }}
        >
          <div className="w-2 h-2 rounded-full bg-white shadow-sm animate-ping"></div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>Queue Progress</span>
        <span className="font-semibold text-slate-600">{percentage}% completed today</span>
      </div>
    </div>
  );
};
