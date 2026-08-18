import React, { useState, useEffect } from 'react';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  UserX,
  Zap,
  PhoneCall,
  Activity,
  Stethoscope,
  RefreshCw,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useSocket } from '../../context/SocketContext.js';
import { queueApi, doctorApi } from '../../services/api.js';
import { QueueState, Token, PriorityLevel } from '../../types/index.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { Modal } from '../../components/common/Modal.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { subscribeToDoctorQueue, lastEventTimestamp } = useSocket();

  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);

  // Priority Modal State
  const [selectedTokenForPriority, setSelectedTokenForPriority] = useState<Token | null>(null);
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState<boolean>(false);

  // Find doctor id
  const doctorId = user?.doctor?.id || user?.id || 'doc-01';

  const fetchDoctorQueue = async () => {
    try {
      subscribeToDoctorQueue(doctorId);
      const res = await queueApi.getDoctorQueue(doctorId);
      if (res.data.success) {
        setQueueState(res.data.data);
        if (res.data.data.doctor) {
          setIsAvailable(res.data.data.doctor.available);
        }
      }
    } catch (err) {
      console.error('Error loading doctor queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorQueue();
  }, [doctorId]);

  useEffect(() => {
    fetchDoctorQueue();
  }, [lastEventTimestamp]);

  // Action: CALL NEXT
  const handleCallNext = async () => {
    try {
      setActionLoading(true);
      const res = await queueApi.callNext(doctorId);
      if (res.data.success) {
        setQueueState(res.data.data.queueState);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error calling next patient');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: START CONSULTATION
  const handleStartConsultation = async (tokenId: string) => {
    try {
      setActionLoading(true);
      const res = await queueApi.startConsultation(doctorId, tokenId);
      if (res.data.success) {
        setQueueState(res.data.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error starting consultation');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: COMPLETE
  const handleComplete = async (tokenId: string) => {
    try {
      setActionLoading(true);
      const res = await queueApi.completeConsultation(doctorId, tokenId);
      if (res.data.success) {
        setQueueState(res.data.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error completing consultation');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: NO SHOW
  const handleNoShow = async (tokenId: string) => {
    if (window.confirm('Mark this patient as NO SHOW? They will be removed from active waiting queue.')) {
      try {
        setActionLoading(true);
        const res = await queueApi.markNoShow(doctorId, tokenId);
        if (res.data.success) {
          setQueueState(res.data.data);
        }
      } catch (err: any) {
        alert(err.response?.data?.message || 'Error marking no show');
      } finally {
        setActionLoading(false);
      }
    }
  };

  // Action: SET PRIORITY
  const handleSetPriority = async (priority: PriorityLevel) => {
    if (!selectedTokenForPriority) return;
    try {
      setActionLoading(true);
      const res = await queueApi.setPriority(selectedTokenForPriority.id, priority);
      if (res.data.success) {
        setQueueState(res.data.data.queueState);
        setIsPriorityModalOpen(false);
        setSelectedTokenForPriority(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error setting priority');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Doctor Availability
  const handleToggleAvailability = async () => {
    try {
      const nextState = !isAvailable;
      setIsAvailable(nextState);
      await doctorApi.update(doctorId, { available: nextState });
    } catch (err) {
      console.error('Error updating availability:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <LoadingSpinner message="Initializing Clinical Console & Room Queues..." size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Doctor Status */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-600 text-white flex items-center justify-center font-bold text-2xl shadow-md">
            DR
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900">{queueState?.doctor.user_name || user?.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
                {queueState?.doctor.department_name || 'General Medicine'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Room 204 • {queueState?.doctor.hospital_name || 'City Care Hospital'} • Avg Consult: {queueState?.doctor.average_consultation_time} min
            </p>
          </div>
        </div>

        {/* Availability Toggle and Call Next Button */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleToggleAvailability}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
              isAvailable
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-slate-100 text-slate-500 border-slate-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`}></span>
            {isAvailable ? 'Status: Accepting Patients' : 'Status: On Break'}
          </button>

          <button
            onClick={handleCallNext}
            disabled={actionLoading || queueState?.waitingCount === 0}
            className="px-6 py-3 bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-700 hover:to-cyan-700 text-white font-extrabold rounded-2xl shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <PhoneCall className="w-4 h-4" />
            {actionLoading ? 'Calling...' : 'CALL NEXT PATIENT'}
          </button>
        </div>
      </div>

      {/* Doctor Dashboard Statistics (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase text-slate-400">Today's Patients</span>
          <div className="text-3xl font-black text-slate-900 font-mono">{queueState?.totalToday || 0}</div>
          <span className="text-[11px] text-slate-500">Total appointments booked</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase text-amber-600">Waiting in Queue</span>
          <div className="text-3xl font-black text-amber-600 font-mono">{queueState?.waitingCount || 0}</div>
          <span className="text-[11px] text-slate-500">Patients in waiting area</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase text-emerald-600">Completed</span>
          <div className="text-3xl font-black text-emerald-600 font-mono">{queueState?.completedCount || 0}</div>
          <span className="text-[11px] text-slate-500">Consultations finished</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase text-brand-600">Average Wait Time</span>
          <div className="text-3xl font-black text-brand-700 font-mono">
            {queueState?.averageWaitTime || 5} <span className="text-xs font-semibold text-slate-400">min</span>
          </div>
          <span className="text-[11px] text-slate-500">Smart prediction speed</span>
        </div>
      </div>

      {/* Active Consultation Spotlight (if any) */}
      {queueState?.currentToken && (
        <div className="bg-gradient-to-r from-rose-500 via-rose-600 to-orange-500 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              Now Serving in Room 204
            </span>
            <StatusBadge status={queueState.currentToken.status} />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-5xl font-black tracking-tight font-mono">
                Token {queueState.currentToken.token_number}
              </div>
              <p className="text-base font-bold text-white/95 mt-1">
                Patient: {queueState.currentToken.patient_name || 'Patient'}
              </p>
              <p className="text-xs text-white/80">Phone: {queueState.currentToken.patient_phone || '+91 98765 20021'}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {queueState.currentToken.status === 'CALLED' && (
                <button
                  onClick={() => handleStartConsultation(queueState.currentToken!.id)}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-white text-rose-700 hover:bg-slate-50 font-bold rounded-xl shadow-md text-xs flex items-center gap-1.5 transition-all"
                >
                  <Play className="w-4 h-4" /> Start Consultation
                </button>
              )}

              <button
                onClick={() => handleComplete(queueState.currentToken!.id)}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-1.5 transition-all"
              >
                <Check className="w-4 h-4" /> Complete Consultation
              </button>

              <button
                onClick={() => handleNoShow(queueState.currentToken!.id)}
                disabled={actionLoading}
                className="px-4 py-2.5 bg-black/20 hover:bg-black/30 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all"
              >
                <UserX className="w-4 h-4" /> Mark No Show
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Queue Management Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Today's Patient Queue</h3>
            <p className="text-xs text-slate-500">Live sequential queue with dynamic priority and wait times</p>
          </div>

          <button
            onClick={fetchDoctorQueue}
            className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh List
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase text-[11px] tracking-wider font-bold">
                <th className="py-3.5 px-4">Token</th>
                <th className="py-3.5 px-4">Patient Details</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Est. Wait</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {queueState?.tokens.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No patients in the queue today.
                  </td>
                </tr>
              ) : (
                queueState?.tokens.map((token) => {
                  const isCurrent = token.status === 'CALLED' || token.status === 'IN_CONSULTATION';
                  return (
                    <tr
                      key={token.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrent ? 'bg-brand-50/50 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-lg font-mono font-bold ${
                          isCurrent ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {token.token_number}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{token.patient_name || 'Patient'}</div>
                        <div className="text-[11px] text-slate-500">{token.patient_phone || '+91 98765 00000'}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge priority={token.priority} size="sm" />
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={token.status} size="sm" />
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                        {isCurrent ? (
                          <span className="text-rose-600 font-bold">Now in Room</span>
                        ) : token.status === 'COMPLETED' ? (
                          <span className="text-slate-400">Completed</span>
                        ) : (
                          `~${token.estimated_wait} min`
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {token.status === 'WAITING' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedTokenForPriority(token);
                                  setIsPriorityModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors"
                                title="Change Priority Level"
                              >
                                Priority
                              </button>

                              <button
                                onClick={() => handleNoShow(token.id)}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-xs transition-colors"
                                title="Mark No Show"
                              >
                                No Show
                              </button>
                            </>
                          )}

                          {isCurrent && (
                            <button
                              onClick={() => handleComplete(token.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-sm transition-colors"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Priority Change Modal (Section 10: Controlled Priority Queue) */}
      <Modal
        isOpen={isPriorityModalOpen}
        onClose={() => setIsPriorityModalOpen(false)}
        title={`Set Priority for Token ${selectedTokenForPriority?.token_number}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Emergency patients jump to the front of the waiting queue immediately. Waiting times for all following patients are dynamically recalculated.
          </p>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleSetPriority('NORMAL')}
              className="p-4 rounded-2xl border border-slate-200 hover:border-slate-400 text-center space-y-1 transition-all"
            >
              <span className="font-bold text-sm text-slate-800 block">NORMAL</span>
              <span className="text-[10px] text-slate-500">Standard FIFO sequence</span>
            </button>

            <button
              onClick={() => handleSetPriority('PRIORITY')}
              className="p-4 rounded-2xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-center space-y-1 transition-all"
            >
              <span className="font-bold text-sm text-amber-800 block">PRIORITY</span>
              <span className="text-[10px] text-amber-700">Elderly / Urgent</span>
            </button>

            <button
              onClick={() => handleSetPriority('EMERGENCY')}
              className="p-4 rounded-2xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-center space-y-1 transition-all"
            >
              <span className="font-bold text-sm text-rose-800 block">🚨 EMERGENCY</span>
              <span className="text-[10px] text-rose-700">Top of Queue</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
