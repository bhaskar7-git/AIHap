import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Ticket,
  Clock,
  Users,
  MapPin,
  Stethoscope,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Activity,
  Share2,
  RefreshCw,
  QrCode
} from 'lucide-react';
import { appointmentApi, queueApi } from '../../services/api.js';
import { Appointment, QueueState } from '../../types/index.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { getScannableBaseUrl } from '../../utils/qrHelper.js';

export const TokenPassPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelledSuccess, setCancelledSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokenDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await appointmentApi.getPublicById(id);
      if (res.data.success && res.data.data) {
        const appt = res.data.data;
        setAppointment(appt);

        // Fetch live queue for doctor
        if (appt.doctor_id) {
          try {
            const qRes = await queueApi.getDoctorQueue(appt.doctor_id, appt.appointment_date);
            if (qRes.data.success) {
              setQueueState(qRes.data.data);
            }
          } catch (e) {
            console.error('Queue fetch error:', e);
          }
        }
      } else {
        setError('Digital token pass not found.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load token pass.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenDetails();
  }, [id]);

  const handleCancelToken = async () => {
    if (!id) return;
    const confirmCancel = window.confirm(
      'Are you sure you want to cancel this Digital Token? This will remove your position from the doctor queue.'
    );
    if (!confirmCancel) return;

    try {
      setCancelling(true);
      const res = await appointmentApi.publicCancel(id);
      if (res.data.success) {
        setCancelledSuccess(true);
        if (appointment) {
          setAppointment({
            ...appointment,
            status: 'CANCELLED',
            token: appointment.token ? { ...appointment.token, status: 'CANCELLED' } : undefined,
          });
        }
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to cancel digital token.');
    } finally {
      setCancelling(false);
    }
  };

  const currentUrl = `${getScannableBaseUrl()}/token-pass/${id}`;

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <Activity className="w-10 h-10 text-brand-600 animate-spin mb-3" />
        <p className="text-slate-600 font-bold text-sm">Loading Digital Token Pass...</p>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="max-w-md mx-auto my-12 px-4 text-center space-y-4">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <XCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900">Token Not Found</h2>
        <p className="text-slate-500 text-sm">{error || 'This digital token pass is invalid or has expired.'}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-bold rounded-xl text-sm hover:bg-brand-700 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Go to Home
        </Link>
      </div>
    );
  }

  const token = appointment.token;
  const isCancelled = appointment.status === 'CANCELLED' || token?.status === 'CANCELLED';
  const isCompleted = appointment.status === 'COMPLETED' || token?.status === 'COMPLETED';
  const isCalled = token?.status === 'CALLED';
  const isInConsultation = token?.status === 'IN_CONSULTATION';

  const waitingTokens = queueState ? queueState.tokens.filter((t) => t.status === 'WAITING') : [];
  const patientsAhead = queueState ? Math.max(0, waitingTokens.findIndex((t) => t.id === token?.id)) : 0;
  const currentServingToken = queueState?.currentToken?.token_number || 'A-21';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 border border-brand-200 text-brand-700 rounded-full text-xs font-bold uppercase tracking-wider">
          <QrCode className="w-3.5 h-3.5" /> Live Scanned Token Pass
        </div>
      </div>

      {/* Main Token Pass Container */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden space-y-0">
        {/* Banner Alert */}
        {cancelledSuccess || isCancelled ? (
          <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-800 flex items-center gap-3">
            <XCircle className="w-6 h-6 text-rose-600 flex-shrink-0" />
            <div>
              <h4 className="font-extrabold text-sm">Digital Token Cancelled</h4>
              <p className="text-xs text-rose-700">This token pass has been successfully cancelled and removed from the active doctor queue.</p>
            </div>
          </div>
        ) : isCalled ? (
          <div className="p-4 bg-rose-600 text-white flex items-center gap-3 animate-pulse">
            <AlertTriangle className="w-6 h-6 text-white flex-shrink-0 animate-bounce" />
            <div>
              <h4 className="font-extrabold text-sm">🚨 YOU ARE NEXT!</h4>
              <p className="text-xs opacity-90">Please proceed immediately to {token?.room_number || 'Room 204'}.</p>
            </div>
          </div>
        ) : isInConsultation ? (
          <div className="p-4 bg-cyan-600 text-white flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-white flex-shrink-0" />
            <div>
              <h4 className="font-extrabold text-sm">Consultation In Progress</h4>
              <p className="text-xs opacity-90">Currently inside {token?.room_number || 'Room 204'}.</p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-emerald-50 border-b border-emerald-200 text-emerald-900 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div>
              <h4 className="font-extrabold text-sm">Active Digital Token Pass</h4>
              <p className="text-xs text-emerald-700">Scanned via QR Code • Real-Time Doctor Queue Sync Enabled</p>
            </div>
          </div>
        )}

        <div className="p-6 sm:p-8 space-y-6">
          {/* Hospital & Doctor Details */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-dashed border-slate-200">
            <div>
              <div className="flex items-center gap-1.5 text-brand-700 text-xs font-bold uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5" />
                <span>{appointment.hospital_name || 'City Care Hospital'}</span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
                {appointment.department_name || 'General Medicine'}
              </h2>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                {appointment.doctor_name || 'Dr. Ravi Kumar'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={appointment.status} />
            </div>
          </div>

          {/* Core Token Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Token Number */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-600 to-cyan-700 text-white shadow-md flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-100">Token Number</span>
              <div className="text-3xl font-extrabold my-1">{token?.token_number || 'A-27'}</div>
              <span className="text-[10px] text-cyan-100">{token?.room_number || 'Room 204'}</span>
            </div>

            {/* Serving Token */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Currently Serving</span>
              <div className="text-2xl font-extrabold text-slate-800 my-1">{currentServingToken}</div>
              <span className="text-[10px] text-brand-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-ping"></span>
                In OPD Room
              </span>
            </div>

            {/* Patients Ahead */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Users className="w-3 h-3" /> Ahead
              </span>
              <div className="text-2xl font-extrabold text-slate-800 my-1">{isCalled ? 0 : patientsAhead}</div>
              <span className="text-[10px] text-slate-500">Patients in Line</span>
            </div>

            {/* Est. Wait */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Est. Wait
              </span>
              <div className="text-2xl font-extrabold text-brand-700 my-1">
                {isCalled ? '0' : `${token?.estimated_wait || 0}`}
                <span className="text-xs font-semibold text-slate-500 ml-0.5">min</span>
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">Smart AI Prediction</span>
            </div>
          </div>

          {/* Appointment Meta & Patient Name */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Patient Name:</span>
              <strong className="text-slate-900">{appointment.patient_name || 'Patient'}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Appointment Date:</span>
              <strong className="text-slate-900">{appointment.appointment_date}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Scheduled Time Slot:</span>
              <strong className="text-slate-900">{appointment.appointment_time}</strong>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
            <div className="p-3 bg-white border border-slate-200 rounded-xl inline-block shadow-sm">
              <QRCodeSVG value={currentUrl} size={140} level="H" />
            </div>
            <p className="text-xs font-bold text-slate-600">Scan this QR Code from any phone camera to view or cancel this token.</p>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
            {!isCancelled && !isCompleted && (
              <button
                onClick={handleCancelToken}
                disabled={cancelling}
                className="w-full sm:flex-1 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                {cancelling ? 'Cancelling Token...' : 'CANCEL DIGITAL TOKEN'}
              </button>
            )}

            <button
              onClick={fetchTokenDetails}
              className="w-full sm:w-auto px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" /> Refresh Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
