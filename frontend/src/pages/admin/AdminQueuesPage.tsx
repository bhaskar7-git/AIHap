import React, { useState, useEffect } from 'react';
import { Layers, Stethoscope, RefreshCw, AlertTriangle, PhoneCall, Check, UserX } from 'lucide-react';
import { doctorApi, queueApi } from '../../services/api.js';
import { Doctor, QueueState } from '../../types/index.js';
import { useSocket } from '../../context/SocketContext.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

export const AdminQueuesPage: React.FC = () => {
  const { lastEventTimestamp } = useSocket();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [queues, setQueues] = useState<Record<string, QueueState>>({});
  const [loading, setLoading] = useState(true);

  const fetchAllQueues = async () => {
    try {
      const docRes = await doctorApi.getAll();
      if (docRes.data.success) {
        setDoctors(docRes.data.data);
        const queueMap: Record<string, QueueState> = {};
        for (const doc of docRes.data.data) {
          const qRes = await queueApi.getDoctorQueue(doc.id);
          if (qRes.data.success) {
            queueMap[doc.id] = qRes.data.data;
          }
        }
        setQueues(queueMap);
      }
    } catch (err) {
      console.error('Error fetching admin queues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllQueues();
  }, []);

  useEffect(() => {
    fetchAllQueues();
  }, [lastEventTimestamp]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <LoadingSpinner message="Loading live multi-department queue feeds..." size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Live Hospital Queue Monitor</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time multi-room queue telemetry and emergency priority controls
          </p>
        </div>

        <button
          onClick={fetchAllQueues}
          className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh All Feeds
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {doctors.map((doc) => {
          const q = queues[doc.id];
          return (
            <div
              key={doc.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-base">
                      DR
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900">{doc.user_name}</h3>
                      <p className="text-xs text-brand-600 font-semibold">{doc.department_name}</p>
                    </div>
                  </div>

                  <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-bold">
                    Room 204
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Current Token</span>
                    <p className="text-lg font-black text-brand-700 font-mono mt-0.5">
                      {q?.currentToken ? q.currentToken.token_number : 'None'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Waiting</span>
                    <p className="text-lg font-black text-amber-600 font-mono mt-0.5">{q?.waitingCount || 0}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Completed</span>
                    <p className="text-lg font-black text-emerald-600 font-mono mt-0.5">{q?.completedCount || 0}</p>
                  </div>
                </div>

                {/* Waiting tokens mini pill sequence */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Queue Order:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                    {q?.tokens.filter(t => t.status === 'WAITING').length === 0 ? (
                      <span className="text-xs text-slate-400 italic">No patients in line</span>
                    ) : (
                      q?.tokens.filter(t => t.status === 'WAITING').map((t) => (
                        <span
                          key={t.id}
                          className={`px-2 py-1 rounded-lg text-xs font-mono font-bold ${
                            t.priority === 'EMERGENCY'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : t.priority === 'PRIORITY'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {t.token_number}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Speed: ~{doc.average_consultation_time} min</span>
                <button
                  onClick={() => queueApi.callNext(doc.id).then(fetchAllQueues)}
                  disabled={q?.waitingCount === 0}
                  className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50"
                >
                  Admin Call Next
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
