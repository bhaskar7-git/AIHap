import React, { useState, useEffect } from 'react';
import { PhoneCall, Play, Check, UserX, AlertTriangle, Layers, Clock, Activity, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useSocket } from '../../context/SocketContext.js';
import { queueApi } from '../../services/api.js';
import { QueueState } from '../../types/index.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

export const DoctorQueuePage: React.FC = () => {
  const { user } = useAuth();
  const { subscribeToDoctorQueue, lastEventTimestamp } = useSocket();
  const doctorId = user?.doctor?.id || user?.id || 'doc-01';

  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchQueue = async () => {
    try {
      subscribeToDoctorQueue(doctorId);
      const res = await queueApi.getDoctorQueue(doctorId);
      if (res.data.success) {
        setQueueState(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [doctorId]);

  useEffect(() => {
    fetchQueue();
  }, [lastEventTimestamp]);

  const handleCallNext = async () => {
    try {
      setActionLoading(true);
      const res = await queueApi.callNext(doctorId);
      if (res.data.success) {
        setQueueState(res.data.data.queueState);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <LoadingSpinner message="Loading full-screen consultation queue..." size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Room 204 Consultation Console</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Dedicated live room queue console for uninterrupted patient intake
          </p>
        </div>

        <button
          onClick={handleCallNext}
          disabled={actionLoading || queueState?.waitingCount === 0}
          className="px-8 py-4 bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-700 hover:to-cyan-700 text-white font-black rounded-2xl shadow-xl shadow-brand-500/30 flex items-center gap-2 text-base disabled:opacity-50 transition-all transform hover:scale-105"
        >
          <PhoneCall className="w-5 h-5" />
          {actionLoading ? 'Advancing Queue...' : 'CALL NEXT PATIENT'}
        </button>
      </div>

      {/* Large Spotlight Box */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Consultation</span>
          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live Room Stream
          </span>
        </div>

        {queueState?.currentToken ? (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="text-6xl font-black text-slate-900 font-mono tracking-tight">
                {queueState.currentToken.token_number}
              </div>
              <p className="text-lg font-bold text-slate-800 mt-2">
                {queueState.currentToken.patient_name || 'Patient'}
              </p>
              <p className="text-xs text-slate-500">{queueState.currentToken.patient_phone}</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => queueApi.completeConsultation(doctorId, queueState.currentToken!.id).then(fetchQueue)}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md text-xs transition-all"
              >
                Mark Completed
              </button>
              <button
                onClick={() => queueApi.markNoShow(doctorId, queueState.currentToken!.id).then(fetchQueue)}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
              >
                No Show
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl">
            No patient currently called into Room 204. Click "CALL NEXT PATIENT" above.
          </div>
        )}
      </div>

      {/* Up Next List */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-base">Up Next in Line ({queueState?.waitingCount} waiting)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {queueState?.tokens.filter(t => t.status === 'WAITING').map((tok, idx) => (
            <div key={tok.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-lg text-slate-800">{tok.token_number}</span>
                <StatusBadge priority={tok.priority} size="sm" />
              </div>
              <p className="text-xs font-semibold text-slate-700 truncate">{tok.patient_name}</p>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                <span>Queue Pos: #{idx + 1}</span>
                <span className="font-mono font-bold text-brand-700">~{tok.estimated_wait} min</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
