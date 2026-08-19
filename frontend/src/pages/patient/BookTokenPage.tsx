import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Stethoscope, Search, Clock, Sparkles, Bot,
  Users, ChevronRight, Zap, MapPin, X, Calendar,
  CheckCircle2, Ticket, ArrowRight, Activity, Copy, Check, AlertCircle
} from 'lucide-react';
import { doctorApi, departmentApi, appointmentApi } from '../../services/api.js';
import { Doctor, Department, Appointment } from '../../types/index.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { useAuth } from '../../context/AuthContext.js';

// Time slots
const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
];

export const BookTokenPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, demoLogin } = useAuth();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Modal state
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState<string>('10:00 AM');
  const [isEmergency, setIsEmergency] = useState<boolean>(false);
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string>('');

  // Confirmed token result
  const [confirmedToken, setConfirmedToken] = useState<Appointment | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([doctorApi.getAll(), departmentApi.getAll()])
      .then(([docRes, deptRes]) => {
        if (docRes.data.success) setDoctors(docRes.data.data);
        if (deptRes.data.success) setDepartments(deptRes.data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = doctors.filter((doc) => {
    const matchesDept = selectedDept === 'ALL' || doc.department_id === selectedDept;
    const q = search.toLowerCase();
    return matchesDept && (
      !search ||
      doc.user_name?.toLowerCase().includes(q) ||
      doc.specialization?.toLowerCase().includes(q) ||
      doc.department_name?.toLowerCase().includes(q) ||
      doc.hospital_name?.toLowerCase().includes(q)
    );
  });

  const openBookingModal = (doc: Doctor, emergency: boolean = false) => {
    setSelectedDoctor(doc);
    setIsEmergency(emergency);
    setBookingError('');
    setConfirmedToken(null);
    setBookingDate(new Date().toISOString().split('T')[0]);
    setBookingTime('10:00 AM');
  };

  const closeModal = () => {
    setSelectedDoctor(null);
    setConfirmedToken(null);
    setBookingError('');
    setIsEmergency(false);
  };

  const handleConfirmBooking = async (overrideEmergency?: boolean) => {
    if (!selectedDoctor) return;
    const emergencyMode = overrideEmergency !== undefined ? overrideEmergency : isEmergency;
    setBooking(true);
    setBookingError('');

    try {
      // Auto-authenticate if guest/unauthenticated user
      if (!isAuthenticated || !user) {
        try {
          await demoLogin('PATIENT');
        } catch (authErr) {
          console.error('Auto login error:', authErr);
        }
      }

      const res = await appointmentApi.create({
        doctor_id: selectedDoctor.id,
        appointment_date: bookingDate,
        appointment_time: bookingTime,
        appointment_type: emergencyMode ? '🚨 EMERGENCY Fast-Track Triage' : 'General Consultation',
        priority: emergencyMode ? 'EMERGENCY' : 'NORMAL',
        patient_id: user?.id,
      });
      if (res.data?.success) {
        setConfirmedToken(res.data.data);
        try {
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        } catch (e) {
          // ignore confetti if unsupported
        }
      }
    } catch (err: any) {
      console.error('Booking error:', err);
      const errMsg = err?.response?.data?.message || err?.message;
      setBookingError(errMsg || 'Booking failed. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  const copyToken = () => {
    if (confirmedToken?.token?.token_number) {
      navigator.clipboard.writeText(String(confirmedToken.token.token_number));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <LoadingSpinner message="Loading available doctors..." size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* ─── Hero Banner ─────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-r from-brand-700 via-brand-600 to-cyan-600 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-xl">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
              <Ticket className="w-7 h-7" /> Book Your Token
            </h1>
            <p className="text-white/80 text-sm max-w-md">
              Pick a doctor, choose your slot, and get your token number instantly.
              Or let <strong>Aria</strong>, our AI assistant, find the right doctor for you.
            </p>
          </div>
          <button
            onClick={() => navigate('/patient/book-appointment')}
            className="group flex items-center gap-3 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/30 rounded-2xl px-5 py-4 transition-all shadow-lg flex-shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-sm">Not sure which doctor?</p>
              <p className="text-white/70 text-xs">Chat with Aria — AI assistant</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/60 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* ─── Search + Count ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search doctor name, specialization, hospital..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-shrink-0">
          <Users className="w-4 h-4 text-brand-400" />
          <span><strong className="text-slate-800">{filtered.length}</strong> doctors available</span>
        </div>
      </div>

      {/* ─── Department Pills ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedDept('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedDept === 'ALL' ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All ({doctors.length})
        </button>
        {departments.map((d) => (
          <button key={d.id} onClick={() => setSelectedDept(d.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedDept === d.id ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {d.name}
          </button>
        ))}
      </div>

      {/* ─── Doctor Cards Grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-3 bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4">
            <Stethoscope className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700">No doctors matched your search.</p>
            <button onClick={() => navigate('/patient/book-appointment')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors">
              <Bot className="w-4 h-4" /> Let Aria help you
            </button>
          </div>
        ) : (
          filtered.map((doc) => (
            <div key={doc.id}
              className="group bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-brand-200 transition-all duration-300 flex flex-col overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-5 flex items-start gap-4 border-b border-slate-100">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-50 to-cyan-50 text-brand-700 flex items-center justify-center font-black text-lg border border-brand-100 flex-shrink-0 group-hover:scale-105 transition-transform">
                  DR
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-slate-900 truncate text-sm sm:text-base">{doc.user_name}</h3>
                  <p className="text-xs font-semibold text-brand-600">{doc.specialization}</p>
                  <p className="text-[11px] text-slate-400 truncate">{doc.qualification}</p>
                </div>
                {doc.available ? (
                  <span className="flex-shrink-0 px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Available
                  </span>
                ) : (
                  <span className="flex-shrink-0 px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full border border-slate-200">
                    Busy
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="px-5 py-3 space-y-2 text-xs flex-1">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" /> Hospital</span>
                  <strong className="text-slate-800 truncate max-w-[140px]">{doc.hospital_name}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" /> Avg Consult</span>
                  <strong className="text-brand-700">~{doc.average_consultation_time} min</strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-400" /> Department</span>
                  <strong className="text-slate-800">{doc.department_name}</strong>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 pt-0 flex items-center gap-2">
                <Link to={`/patient/queue?doctor=${doc.id}`}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors">
                  <Users className="w-3.5 h-3.5" /> Live Queue
                </Link>
                <button
                  onClick={() => openBookingModal(doc)}
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm hover:shadow transition-all"
                >
                  <Ticket className="w-3.5 h-3.5" /> Book Token
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── Bottom AI Banner ────────────────────────────────────────── */}
      <div onClick={() => navigate('/patient/book-appointment')}
        className="cursor-pointer bg-gradient-to-r from-slate-900 to-brand-900 rounded-2xl p-5 flex items-center gap-4 hover:from-brand-900 hover:to-slate-900 transition-all shadow-lg group">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/20 border border-brand-400/30 flex items-center justify-center flex-shrink-0">
          <Bot className="w-6 h-6 text-brand-300" />
        </div>
        <div className="flex-1">
          <p className="text-white font-bold text-sm">Not sure which specialist to choose?</p>
          <p className="text-slate-400 text-xs">Aria will chat with you and recommend the perfect doctor based on your symptoms.</p>
        </div>
        <ChevronRight className="w-5 h-5 text-brand-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* BOOKING MODAL                                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

          {/* Modal Card */}
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden animate-fade-in">

            {/* ── STEP 1: Pick date & time ── */}
            {!confirmedToken ? (
              <div className="flex flex-col h-full max-h-[85vh] overflow-hidden">
                {/* Modal Header - Fixed at Top */}
                <div className="bg-gradient-to-r from-brand-700 to-cyan-600 p-4 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-base">
                      DR
                    </div>
                    <div>
                      <h2 className="text-white font-extrabold text-sm">{selectedDoctor.user_name}</h2>
                      <p className="text-white/80 text-xs">{selectedDoctor.specialization}</p>
                      <p className="text-cyan-200 text-[11px]">{selectedDoctor.hospital_name}</p>
                    </div>
                  </div>
                  <button onClick={closeModal} className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body - Scrollable Middle Area */}
                <div className="p-4 space-y-3 flex-1 overflow-y-auto min-h-0">
                  <p className="text-xs font-bold text-slate-700">Choose your appointment slot:</p>

                  {/* Date Picker */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-brand-500" /> Appointment Date
                    </label>
                    <input
                      type="date"
                      value={bookingDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  {/* Time Slot Grid */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-brand-500" /> Time Slot ({bookingTime})
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {TIME_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setBookingTime(slot)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border ${
                            bookingTime === slot
                              ? 'bg-brand-600 text-white border-brand-600 shadow-md scale-105'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300 hover:bg-brand-50'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Priority Level Selector */}
                  <div className="p-3 rounded-2xl border transition-all space-y-2 bg-slate-50 border-slate-200">
                    <span className="text-xs font-bold text-slate-700 block">Priority Level:</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEmergency(false);
                          handleConfirmBooking(false);
                        }}
                        disabled={booking}
                        className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all border flex items-center justify-center gap-1 active:scale-95 disabled:opacity-60 ${
                          !isEmergency
                            ? 'bg-brand-600 hover:bg-brand-700 text-white border-brand-600 shadow-md'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {booking && !isEmergency ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            Booking...
                          </>
                        ) : (
                          <>
                            <Ticket className="w-3.5 h-3.5" /> Standard Booking
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEmergency(true);
                          handleConfirmBooking(true);
                        }}
                        disabled={booking}
                        className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all border flex items-center justify-center gap-1 active:scale-95 disabled:opacity-60 ${
                          isEmergency
                            ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 shadow-md ring-2 ring-rose-400 animate-pulse'
                            : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                        }`}
                      >
                        {booking && isEmergency ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            Swapping...
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5" /> 🚨 EMERGENCY SWAP
                          </>
                        )}
                      </button>
                    </div>
                    {isEmergency ? (
                      <p className="text-[11px] text-rose-700 font-semibold bg-rose-50 p-2 rounded-lg border border-rose-200">
                        ⚡ <strong>Emergency Fast-Track:</strong> Swaps your token directly into Room 204 immediately.
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-500 font-medium p-1">
                        ✓ <strong>Standard Booking:</strong> Generates your OPD queue token for {bookingTime}.
                      </p>
                    )}
                  </div>

                  {/* Doctor quick info */}
                  <div className="bg-slate-50 rounded-2xl p-2.5 flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" /> Avg consult time</span>
                    <strong className="text-brand-700">~{selectedDoctor.average_consultation_time} min</strong>
                  </div>

                  {bookingError && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-xs text-rose-700 font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                      {bookingError}
                    </div>
                  )}
                </div>

                {/* Footer Confirm Button - Guaranteed Fixed at Bottom of Modal */}
                <div className="p-3 bg-white border-t border-slate-100 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleConfirmBooking()}
                    disabled={booking}
                    className={`w-full py-3 disabled:opacity-60 text-white font-extrabold rounded-2xl shadow-lg transition-all text-sm flex items-center justify-center gap-2 ${
                      isEmergency
                        ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/30 ring-2 ring-rose-400'
                        : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/20'
                    }`}
                  >
                    {booking ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        {isEmergency ? 'Allocating Emergency Room 204...' : 'Booking your slot...'}
                      </>
                    ) : isEmergency ? (
                      <>
                        <Zap className="w-4 h-4" /> 🚨 Allocate Emergency Token & Swap Now
                      </>
                    ) : (
                      <>
                        <Ticket className="w-4 h-4" /> Confirm & Get Token ({bookingTime})
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* ── STEP 2: Token Confirmed ── */
              <div className="p-6 space-y-5 text-center">
                {/* Success Icon */}
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-md ${
                  confirmedToken.token?.priority === 'EMERGENCY' ? 'bg-rose-100 animate-bounce' : 'bg-emerald-100'
                }`}>
                  {confirmedToken.token?.priority === 'EMERGENCY' ? (
                    <Zap className="w-9 h-9 text-rose-600" />
                  ) : (
                    <CheckCircle2 className="w-9 h-9 text-emerald-500" />
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    {confirmedToken.token?.priority === 'EMERGENCY' ? '🚨 EMERGENCY TOKEN ALLOCATED!' : 'Booking Confirmed! 🎉'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {confirmedToken.token?.priority === 'EMERGENCY'
                      ? 'You have been swapped into Room 204 immediately. Proceed inside now.'
                      : 'Your token has been generated successfully.'}
                  </p>
                </div>

                {/* Big Token Number */}
                <div className={`rounded-3xl p-6 text-white shadow-xl ${
                  confirmedToken.token?.priority === 'EMERGENCY'
                    ? 'bg-gradient-to-br from-rose-600 via-rose-700 to-red-800 ring-4 ring-rose-400 animate-pulse'
                    : 'bg-gradient-to-br from-brand-600 to-cyan-600'
                }`}>
                  <p className="text-white/80 text-xs uppercase tracking-widest font-bold mb-1">
                    {confirmedToken.token?.priority === 'EMERGENCY' ? '🚨 Emergency Token (Room 204)' : 'Your Token Number'}
                  </p>
                  <div className="text-6xl font-black font-mono tracking-tight">
                    {confirmedToken.token?.token_number ?? '—'}
                  </div>
                  <button
                    onClick={copyToken}
                    className="mt-3 flex items-center gap-1.5 mx-auto px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy Token'}
                  </button>
                </div>

                {/* Appointment Details */}
                <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Doctor</span>
                    <strong className="text-slate-800">{selectedDoctor.user_name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Room</span>
                    <strong className="text-rose-600 font-bold">Room 204 (Immediate)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Status</span>
                    <strong className="text-rose-600 font-bold">
                      {confirmedToken.token?.priority === 'EMERGENCY' ? '🚨 CALLED / IN SERVICE' : 'WAITING'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Est. Wait</span>
                    <strong className="text-brand-700">
                      {confirmedToken.token?.priority === 'EMERGENCY' ? '0 min (IMMEDIATE ENTRY)' : `~${confirmedToken.token?.estimated_wait ?? 10} min`}
                    </strong>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-sm transition-colors"
                  >
                    Book Another
                  </button>
                  <button
                    onClick={() => navigate('/patient/queue')}
                    className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-1.5 shadow-md transition-all"
                  >
                    <Activity className="w-4 h-4" /> Track Queue
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
