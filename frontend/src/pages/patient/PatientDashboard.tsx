import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Calendar,
  Layers,
  Clock,
  MapPin,
  Stethoscope,
  Activity,
  Plus,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Bell,
  Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useSocket } from '../../context/SocketContext.js';
import { appointmentApi, queueApi } from '../../services/api.js';
import { Appointment, Token, QueueState } from '../../types/index.js';
import { TokenCard } from '../../components/queue/TokenCard.js';
import { QueueProgressBar } from '../../components/queue/QueueProgressBar.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

export const PatientDashboard: React.FC = () => {
  const { user } = useAuth();
  const { subscribeToDoctorQueue, unsubscribeFromDoctorQueue, lastEventTimestamp } = useSocket();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [activeQueue, setActiveQueue] = useState<QueueState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const res = await appointmentApi.getAll();
      if (res.data.success) {
        const appts = res.data.data;
        setAppointments(appts);

        // Find today's active or waiting appointment
        const active = appts.find(
          (a) => a.status === 'WAITING' || a.status === 'CALLED' || a.status === 'IN_CONSULTATION' || a.status === 'BOOKED'
        ) || (appts.length > 0 ? appts[0] : null);

        setActiveAppointment(active);

        // If active appointment exists, fetch live queue for doctor
        if (active?.doctor_id) {
          subscribeToDoctorQueue(active.doctor_id);
          const queueRes = await queueApi.getDoctorQueue(active.doctor_id);
          if (queueRes.data.success) {
            setActiveQueue(queueRes.data.data);
          }
        }
      }
    } catch (err) {
      console.error('Error loading patient dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // When a socket event arrives, refresh queue state
  useEffect(() => {
    if (activeAppointment?.doctor_id) {
      queueApi.getDoctorQueue(activeAppointment.doctor_id).then((res) => {
        if (res.data.success) {
          setActiveQueue(res.data.data);
        }
      });
      // Also refresh appointment details in case token status changed (e.g. CALLED, COMPLETED)
      appointmentApi.getAll().then((res) => {
        if (res.data.success) {
          setAppointments(res.data.data);
          const updatedActive = res.data.data.find((a) => a.id === activeAppointment.id);
          if (updatedActive) {
            setActiveAppointment(updatedActive);
          }
        }
      });
    }
  }, [lastEventTimestamp]);

  const handleCancelAppointment = async () => {
    if (!activeAppointment) return;
    if (window.confirm('Are you sure you want to cancel this appointment and token?')) {
      try {
        await appointmentApi.cancel(activeAppointment.id);
        fetchDashboardData();
      } catch (err) {
        console.error('Cancel appointment error:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <LoadingSpinner message="Loading your patient dashboard..." size="lg" />
      </div>
    );
  }

  // Calculate dynamic stats for active token
  let currentTokenNumber = activeQueue?.currentToken?.token_number || 'A-21';
  let patientsAhead = 0;

  if (activeQueue && activeAppointment?.token) {
    const myTokenId = activeAppointment.token.id;
    const waitingTokens = activeQueue.tokens.filter((t) => t.status === 'WAITING');
    const idx = waitingTokens.findIndex((t) => t.id === myTokenId);
    if (idx !== -1) {
      patientsAhead = idx + (activeQueue.currentToken ? 1 : 0);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-700 via-cyan-700 to-teal-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold backdrop-blur-sm">
            <Activity className="w-3.5 h-3.5" />
            Patient Health Console
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            Welcome, {user?.name}!
          </h1>
          <p className="text-white/80 text-sm max-w-xl">
            Track your digital appointments, watch live doctor queue progression in real time, and arrive right on time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchDashboardData();
            }}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md transition-colors"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <Link
            to="/patient/book-token"
            className="px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center gap-2 text-sm ring-2 ring-rose-400 animate-pulse"
          >
            <Zap className="w-4 h-4" /> 🚨 Emergency Token
          </Link>

          <Link
            to="/patient/book-token"
            className="px-5 py-3 bg-white hover:bg-slate-50 text-brand-800 font-bold rounded-2xl shadow-lg transition-all flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> Book New Token
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      {activeAppointment && activeAppointment.token ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Big Token Card */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-ping"></span>
                Active Digital Token & Live Status
              </h2>
              <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Real-Time Sync Active
              </span>
            </div>

            <TokenCard
              token={activeAppointment.token}
              appointment={activeAppointment}
              currentTokenNumber={currentTokenNumber}
              patientsAhead={patientsAhead}
              onCancel={handleCancelAppointment}
            />

            {/* Queue Progress Bar */}
            <QueueProgressBar
              currentStep={(activeQueue?.completedCount || 0) + (activeQueue?.currentToken ? 1 : 0)}
              totalTokens={activeQueue?.totalToday || 10}
              yourTokenNumber={activeAppointment.token.token_number}
              currentTokenNumber={currentTokenNumber}
            />
          </div>

          {/* Right Column: Quick Info & Actions */}
          <div className="lg:col-span-4 space-y-6">
            {/* Doctor & Room Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-brand-600" />
                Doctor On Duty
              </h3>

              <div className="p-4 bg-slate-50 rounded-2xl space-y-2 text-xs">
                <p className="font-bold text-sm text-slate-800">{activeAppointment.doctor_name || 'Dr. Ravi Kumar'}</p>
                <p className="text-slate-500">{activeAppointment.specialization || 'General Physician'}</p>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-slate-600">
                  <span>Room:</span>
                  <strong className="text-brand-700">{activeAppointment.token.room_number || 'Room 204'}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Avg Consult:</span>
                  <strong>{activeQueue?.averageWaitTime || 5} min</strong>
                </div>
              </div>

              <Link
                to={`/patient/queue?doctor=${activeAppointment.doctor_id}`}
                className="w-full py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Layers className="w-4 h-4" /> View Full Doctor Queue
              </Link>
            </div>

            {/* Quick Health Actions */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-sm text-slate-900">Quick Shortcuts</h3>
              <div className="space-y-2">
                <Link
                  to="/patient/hospitals"
                  className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-cyan-600" /> Hospital Directory
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>

                <Link
                  to="/patient/appointments"
                  className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand-600" /> Appointment History
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>

                <Link
                  to="/qr-register"
                  className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" /> Hospital Lobby QR
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State: No active token */
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-6 max-w-xl mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-brand-50 text-brand-600 mx-auto flex items-center justify-center">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900">No Active Appointments Today</h3>
            <p className="text-xs sm:text-sm text-slate-500">
              You do not have any digital token queued. Book an appointment with our specialist doctors in seconds.
            </p>
          </div>
          <Link
            to="/patient/book-token"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl shadow-md transition-all text-sm"
          >
            <Sparkles className="w-4 h-4" />
            Book Digital Token
          </Link>
        </div>
      )}
    </div>
  );
};
