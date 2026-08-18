import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layers, Clock, Users, Activity, Stethoscope, RefreshCw, Zap, ShieldCheck } from 'lucide-react';
import { doctorApi, queueApi } from '../../services/api.js';
import { Doctor, QueueState } from '../../types/index.js';
import { useSocket } from '../../context/SocketContext.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

export const LiveQueuePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryDoctorId = searchParams.get('doctor');

  const { subscribeToDoctorQueue, unsubscribeFromDoctorQueue, lastEventTimestamp } = useSocket();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(queryDoctorId || '');
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    doctorApi.getAll().then((res) => {
      if (res.data.success && res.data.data.length > 0) {
        setDoctors(res.data.data);
        if (!selectedDoctorId) {
          setSelectedDoctorId(res.data.data[0].id);
        }
      }
    }).finally(() => setLoading(false));
  }, []);

  const fetchLiveQueue = async (docId: string) => {
    if (!docId) return;
    try {
      setRefreshing(true);
      subscribeToDoctorQueue(docId);
      const res = await queueApi.getDoctorQueue(docId);
      if (res.data.success) {
        setQueueState(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching live queue:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedDoctorId) {
      fetchLiveQueue(selectedDoctorId);
    }
  }, [selectedDoctorId]);

  // Real-time update trigger
  useEffect(() => {
    if (selectedDoctorId) {
      queueApi.getDoctorQueue(selectedDoctorId).then((res) => {
        if (res.data.success) {
          setQueueState(res.data.data);
        }
      });
    }
  }, [lastEventTimestamp]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <LoadingSpinner message="Connecting to live hospital queue streams..." size="lg" />
      </div>
    );
  }

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping"></span>
            Real-Time Socket Stream
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Live Hospital Queue Tracker</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time consultation monitor powered by Smart Queue prediction algorithms
          </p>
        </div>

        {/* Doctor Selector */}
        <div className="flex items-center gap-3">
          <select
            value={selectedDoctorId}
            onChange={(e) => {
              if (selectedDoctorId) unsubscribeFromDoctorQueue(selectedDoctorId);
              setSelectedDoctorId(e.target.value);
            }}
            className="p-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 shadow-sm focus:ring-2 focus:ring-brand-500"
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.user_name} ({d.department_name})
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchLiveQueue(selectedDoctorId)}
            className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 shadow-sm transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top Highlight Stats */}
      {queueState && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Current Serving Token */}
          <div className="bg-gradient-to-br from-brand-600 to-cyan-700 text-white p-6 rounded-3xl shadow-lg space-y-1">
            <span className="text-xs font-bold uppercase text-cyan-200">Current in Room</span>
            <div className="text-4xl font-black tracking-tight font-mono my-1">
              {queueState.currentToken ? queueState.currentToken.token_number : 'None'}
            </div>
            <span className="text-[11px] text-cyan-100 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {queueState.currentToken ? 'Consultation Active' : 'Waiting for next patient'}
            </span>
          </div>

          {/* Waiting Patients */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-1">
            <span className="text-xs font-bold uppercase text-slate-400">Waiting Patients</span>
            <div className="text-4xl font-black text-slate-900 my-1 font-mono">
              {queueState.waitingCount}
            </div>
            <span className="text-[11px] text-slate-500">In line for consultation</span>
          </div>

          {/* Estimated Next Wait */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-1">
            <span className="text-xs font-bold uppercase text-slate-400">Avg Consult Speed</span>
            <div className="text-4xl font-black text-brand-700 my-1 font-mono">
              {queueState.averageWaitTime} <span className="text-xs font-semibold text-slate-400">min</span>
            </div>
            <span className="text-[11px] text-slate-500">Calculated per patient</span>
          </div>

          {/* Completed Consultations */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-1">
            <span className="text-xs font-bold uppercase text-slate-400">Completed Today</span>
            <div className="text-4xl font-black text-emerald-600 my-1 font-mono">
              {queueState.completedCount}
            </div>
            <span className="text-[11px] text-slate-500">Patients served today</span>
          </div>
        </div>
      )}

      {/* Live Waiting Queue List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-600" />
            Live Queue Sequence for {selectedDoctor?.user_name}
          </h3>
          <span className="text-xs text-brand-600 font-semibold bg-brand-50 px-3 py-1 rounded-full border border-brand-100">
            Room 204
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase text-[11px] tracking-wider font-bold">
                <th className="py-3.5 px-4">Queue Pos</th>
                <th className="py-3.5 px-4">Token Number</th>
                <th className="py-3.5 px-4">Patient Name</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Smart Predicted Wait</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {queueState?.tokens.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No active tokens in this doctor's queue today.
                  </td>
                </tr>
              ) : (
                queueState?.tokens.map((tok, idx) => {
                  const isCurrent = tok.status === 'CALLED' || tok.status === 'IN_CONSULTATION';
                  return (
                    <tr
                      key={tok.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrent ? 'bg-brand-50/60 font-bold' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                            NOW
                          </span>
                        ) : (
                          `#${idx + 1}`
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-lg font-mono font-bold ${
                          isCurrent ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {tok.token_number}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-900">
                        {tok.patient_name || 'Patient'}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge priority={tok.priority} size="sm" />
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={tok.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4">
                        {isCurrent ? (
                          <span className="text-rose-600 font-bold">In Room Now</span>
                        ) : tok.status === 'COMPLETED' ? (
                          <span className="text-slate-400">Completed</span>
                        ) : (
                          <span className="text-brand-700 font-bold font-mono">
                            ~{tok.estimated_wait} min
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
