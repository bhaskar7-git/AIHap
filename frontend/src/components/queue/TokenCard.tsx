import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Clock,
  Users,
  MapPin,
  Stethoscope,
  Calendar,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  MapPinCheckInside,
  ClipboardList
} from 'lucide-react';
import { Token, Appointment } from '../../types/index.js';
import { StatusBadge } from '../common/StatusBadge.js';
import { queueApi } from '../../services/api.js';

interface TokenCardProps {
  token: Token;
  appointment?: Appointment;
  currentTokenNumber?: string;
  patientsAhead?: number;
  onCancel?: () => void;
  onArrived?: () => void;
}

export const TokenCard: React.FC<TokenCardProps> = ({
  token,
  appointment,
  currentTokenNumber = 'A-21',
  patientsAhead = 0,
  onCancel,
  onArrived,
}) => {
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkinSuccess, setCheckinSuccess] = useState<string | null>(token.arrived_at || null);
  const [checkinError, setCheckinError] = useState<string>('');

  const isCalled = token.status === 'CALLED';
  const isInConsultation = token.status === 'IN_CONSULTATION';
  const isCompleted = token.status === 'COMPLETED';
  const isCancelled = token.status === 'CANCELLED';
  const isNoShow = token.status === 'NO_SHOW';

  const handleArrivalCheckin = async () => {
    setCheckingIn(true);
    setCheckinError('');
    try {
      const res = await queueApi.patientArrival(token.id);
      if (res.data.success) {
        setCheckinSuccess(new Date().toISOString());
        if (onArrived) onArrived();
      }
    } catch (err: any) {
      setCheckinError(err?.response?.data?.message || 'Check-in failed. Please try again.');
    } finally {
      setCheckingIn(false);
    }
  };

  // Determine status color and banner message
  let bannerBg = 'bg-emerald-50 border-emerald-200 text-emerald-900';
  let bannerIcon = <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />;
  let bannerTitle = "You're on track";
  let bannerSubtitle = `${patientsAhead} patient(s) ahead. Please remain in the waiting area.`;

  if (isCalled) {
    bannerBg = 'bg-rose-600 text-white border-rose-500 animate-pulse';
    bannerIcon = <AlertTriangle className="w-6 h-6 text-white flex-shrink-0 animate-bounce" />;
    bannerTitle = "🚨 YOU ARE NEXT!";
    bannerSubtitle = `Please proceed immediately to ${token.room_number || 'Room 204'}. The doctor is ready.`;
  } else if (isInConsultation) {
    bannerBg = 'bg-cyan-600 text-white border-cyan-500';
    bannerIcon = <CheckCircle2 className="w-6 h-6 text-white flex-shrink-0" />;
    bannerTitle = "Consultation In Progress";
    bannerSubtitle = `Currently inside ${token.room_number || 'Room 204'}.`;
  } else if (patientsAhead <= 2 && patientsAhead > 0) {
    bannerBg = 'bg-amber-500 text-white border-amber-400 animate-pulse';
    bannerIcon = <AlertCircle className="w-5 h-5 text-white flex-shrink-0" />;
    bannerTitle = "Your appointment is approaching";
    bannerSubtitle = `Only ${patientsAhead} patient(s) ahead of you. Move closer to ${token.room_number || 'Room 204'}.`;
  } else if (isCompleted) {
    bannerBg = 'bg-slate-100 border-slate-200 text-slate-800';
    bannerIcon = <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />;
    bannerTitle = "Consultation Completed";
    bannerSubtitle = "Thank you for visiting SmartQueue healthcare.";
  }

  // Generate a real, scannable URL — points to live queue for this appointment
  const baseUrl = window.location.origin;
  const qrData = `${baseUrl}/patient/queue?doctor=${token.doctor_id || ''}&token=${token.id}&t=${token.token_number}`;

  const preVisitChecklist: string[] = (appointment?.ai_summary as any)?.pre_visit_checklist || [
    'Bring prior medical records, prescriptions, or blood test reports',
    'Keep a note of fever onset time or key symptom progression',
    'Arrive at the clinic lobby 10 minutes prior to your slot'
  ];

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden transition-all hover:shadow-2xl">
      {/* Dynamic Status Alert Banner */}
      {!isCancelled && !isNoShow && (
        <div className={`px-6 py-4 border-b flex items-center gap-3 ${bannerBg}`}>
          {bannerIcon}
          <div>
            <h4 className="font-bold text-sm leading-tight">{bannerTitle}</h4>
            <p className="text-xs opacity-90 leading-tight mt-0.5">{bannerSubtitle}</p>
          </div>
        </div>
      )}

      <div className="p-6 sm:p-8">
        {/* Top Header: Hospital & Badge */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-dashed border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-brand-700 text-xs font-bold uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5" />
              <span>{token.hospital_name || 'City Care Hospital'}</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              {token.department_name || 'General Medicine'}
            </h3>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
              {token.doctor_name || 'Dr. Ravi Kumar'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {token.priority !== 'NORMAL' && <StatusBadge priority={token.priority} />}
            <StatusBadge status={token.status} />
          </div>
        </div>

        {/* Patient Arrival Check-In Action Section */}
        {token.status === 'WAITING' && (
          <div className="my-5 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <MapPinCheckInside className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-extrabold text-sm text-slate-900">
                  {checkinSuccess || token.arrived_at ? "Checked In at Clinic" : "Arrived at the Hospital?"}
                </h5>
                <p className="text-xs text-slate-600">
                  {checkinSuccess || token.arrived_at
                    ? "Doctors can see that you are physically present in the waiting room."
                    : "Tap 'I've Arrived' when you reach the waiting lobby so the doctor knows you are ready."}
                </p>
              </div>
            </div>

            {checkinSuccess || token.arrived_at ? (
              <span className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm flex-shrink-0">
                <CheckCircle2 className="w-4 h-4" /> 🟢 Checked In
              </span>
            ) : (
              <button
                onClick={handleArrivalCheckin}
                disabled={checkingIn}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all flex-shrink-0"
              >
                {checkingIn ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <MapPinCheckInside className="w-4 h-4" />
                )}
                I've Arrived at Clinic
              </button>
            )}
          </div>
        )}

        {checkinError && (
          <div className="mb-4 px-4 py-2 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
            {checkinError}
          </div>
        )}

        {/* Core Live Token Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6">
          {/* Your Token */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-600 to-cyan-700 text-white shadow-md flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-100">Your Token</span>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight my-1">{token.token_number}</div>
            <span className="text-[10px] text-cyan-100">{token.room_number || 'Room 204'}</span>
          </div>

          {/* Current Serving Token */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Current Token</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 my-1">
              {isCalled ? token.token_number : currentTokenNumber || 'A-21'}
            </div>
            <span className="text-[10px] text-brand-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-ping"></span>
              Live in Room
            </span>
          </div>

          {/* Patients Ahead */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Users className="w-3 h-3" /> Ahead
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 my-1">
              {isCalled ? 0 : patientsAhead}
            </div>
            <span className="text-[10px] text-slate-500">In Waiting Queue</span>
          </div>

          {/* Estimated Wait */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Est. Wait
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-brand-700 my-1">
              {isCalled ? '0' : `${token.estimated_wait || 0}`}
              <span className="text-xs font-semibold text-slate-500 ml-1">min</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">Smart Queue Prediction</span>
          </div>
        </div>

        {/* AI Pre-Visit Checklist */}
        {preVisitChecklist.length > 0 && (
          <div className="my-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-brand-600" />
              AI Pre-Consultation Checklist
            </h5>
            <ul className="space-y-1.5 text-xs text-slate-600">
              {preVisitChecklist.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* QR Code & Appointment Details Bottom Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 border-t border-slate-100">
          <div className="space-y-1.5 text-xs text-slate-600 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Date: <strong className="text-slate-800">{token.appointment_date || 'Today'}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Slot: <strong className="text-slate-800">{token.appointment_time || '10:00 AM'}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Patient: <strong className="text-slate-800">{token.patient_name || 'Patient'}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
              <QRCodeSVG value={qrData} size={64} />
              <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Fast Scan</span>
            </div>

            {onCancel && token.status === 'WAITING' && (
              <button
                onClick={onCancel}
                className="px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors"
              >
                Cancel Token
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

