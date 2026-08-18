import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Stethoscope,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Activity,
  AlertTriangle,
  Flame,
  Check,
  ShieldAlert,
  Send,
  User,
  Bot,
  HeartPulse,
  Pill,
  Award,
  ChevronRight,
  Info,
  ShieldCheck
} from 'lucide-react';
import { doctorApi, appointmentApi, aiApi, TriageResponse, InterimRelief } from '../../services/api.js';
import { Doctor, Appointment, PriorityLevel } from '../../types/index.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

const QUICK_SYMPTOM_CHIPS = [
  { label: '🫀 Chest Pain / Palpitations', value: 'I have severe chest tightness and palpitations.', onset: 'Since morning', severity: 'Severe' },
  { label: '🌿 Skin Rash / Severe Itch', value: 'I have red itchy skin rash with burning sensation.', onset: '2-3 Days', severity: 'Moderate' },
  { label: '🦴 Knee / Back Joint Pain', value: 'I have severe lower back and knee joint pain making it hard to walk.', onset: '1-2 Weeks', severity: 'Moderate' },
  { label: '🤒 High Fever with Chills', value: 'I have 102°F fever with body chills and severe headache.', onset: 'Since yesterday', severity: 'Severe' },
  { label: '👶 Child Fever & Cough', value: 'My child is running a high fever and coughing continuously.', onset: '2 Days', severity: 'Moderate' },
  { label: '🧠 Severe Migraine / Nausea', value: 'I have intense throbbing one-sided headache with vomiting sensation.', onset: 'Today', severity: 'Severe' },
  { label: '🤢 Burning Stomach Acidity', value: 'I have severe burning abdominal pain and acid reflux after eating.', onset: '3 Days', severity: 'Moderate' },
  { label: '👁️ Red Eye & Blurry Vision', value: 'I have red painful eye discharge and stinging sensation.', onset: '2 Days', severity: 'Moderate' },
];

export const BookAppointmentPage: React.FC = () => {
  const navigate = useNavigate();

  // Wizard Step:
  // 1: Chief Symptoms
  // 2: Onset & Severity Details
  // 3: AI Analyzing
  // 4: AI Assessment, Interim Relief & Matched Specialists
  // 5: Confirmed Token Pass
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // Step 1: Chief Problem
  const [symptomText, setSymptomText] = useState<string>('');

  // Step 2: Onset & Clinical Characteristics
  const [onsetPeriod, setOnsetPeriod] = useState<string>('2-3 Days');
  const [severity, setSeverity] = useState<'Mild' | 'Moderate' | 'Severe'>('Moderate');
  const [painType, setPainType] = useState<string>('Continuous / Throbbing');
  const [associatedSymptoms, setAssociatedSymptoms] = useState<string>('');
  const [appointmentDate, setAppointmentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [appointmentTime, setAppointmentTime] = useState<string>('10:00 AM');

  // Step 4: AI Results
  const [aiTriageResult, setAiTriageResult] = useState<TriageResponse | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  // Step 5: Confirmed Token
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await doctorApi.getAll();
        if (res.data.success) {
          setDoctors(res.data.data);
        }
      } catch (err) {
        console.error('Error loading doctors:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  // Action: Submit to AI Diagnostic Engine
  const handleRunAiDiagnostic = async () => {
    if (!symptomText.trim()) return;

    setCurrentStep(3); // Show Analyzing Animation

    try {
      const messages = [
        {
          role: 'user' as const,
          content: `Chief Complaint: ${symptomText}.
Onset & Duration: Facing this issue from ${onsetPeriod}.
Severity Level: ${severity} pain/discomfort.
Pain/Symptom Nature: ${painType}.
Other Accompanying Symptoms: ${associatedSymptoms || 'None reported'}.
Requested Appointment Slot: ${appointmentDate} at ${appointmentTime}.`,
        },
      ];

      const res = await aiApi.chatTriage(messages, appointmentDate, appointmentTime);

      if (res.data.success) {
        setAiTriageResult(res.data.data);
        if (res.data.data.recommended_doctors && res.data.data.recommended_doctors.length > 0) {
          setSelectedDoctor(res.data.data.recommended_doctors[0].doctor);
        } else if (doctors.length > 0) {
          setSelectedDoctor(doctors[0]);
        }
      }
    } catch (err: any) {
      console.error('AI Diagnostic error:', err);
      if (doctors.length > 0) {
        setSelectedDoctor(doctors[0]);
      }
    } finally {
      setCurrentStep(4);
    }
  };

  // Action: Confirm & Book Digital Token
  const handleConfirmBooking = async (docToBook?: Doctor) => {
    const targetDoc = docToBook || selectedDoctor;
    if (!targetDoc) return;

    try {
      setSubmitting(true);

      const triage = aiTriageResult?.triage;
      const urgency = triage?.urgency || (severity === 'Severe' ? 'PRIORITY' : 'NORMAL');
      const interim = aiTriageResult?.interim_relief;

      const res = await appointmentApi.create({
        doctor_id: targetDoc.id,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        appointment_type: triage?.specialization_needed
          ? `${triage.specialization_needed} Consultation`
          : `${targetDoc.specialization} Consultation`,
        ai_summary: {
          chief_complaint: triage?.chief_complaint || symptomText,
          onset_and_duration: triage?.onset_and_duration || onsetPeriod,
          severity: triage?.severity || severity,
          pain_characteristics: triage?.pain_characteristics || painType,
          urgency: urgency,
          interim_medication: interim?.recommended_remedy,
          notes: triage?.notes || `Patient booked via SmartQueue AI Assistant. Onset: ${onsetPeriod}.`,
        },
        priority: urgency as PriorityLevel,
      });

      if (res.data.success) {
        setConfirmedAppointment(res.data.data);
        setCurrentStep(5);

        confetti({
          particleCount: 130,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#0891b2', '#06b6d4', '#10b981', '#3b82f6'],
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to book appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <LoadingSpinner message="Initializing SmartQueue Clinical Diagnostic Assistant..." size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {/* STEP PROGRESS BAR */}
      {currentStep < 5 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-brand-700">
              <Sparkles className="w-4 h-4 text-brand-600" />
              AI Clinical Diagnostic Intake
            </span>
            <span>Step {Math.min(currentStep, 4)} of 4</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { step: 1, label: '1. Problem' },
              { step: 2, label: '2. Onset & Details' },
              { step: 3, label: '3. AI Triage' },
              { step: 4, label: '4. Relief & Doctor' },
            ].map((s) => (
              <div
                key={s.step}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentStep >= s.step ? 'bg-brand-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: CHIEF SYMPTOM / PROBLEM */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-6 animate-fade-in">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xl shadow-xs">
              <Bot className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">What health problem are you facing?</h2>
            <p className="text-sm text-slate-500">
              Describe your symptoms in your own words or select one of the common conditions below.
            </p>
          </div>

          {/* Text Area */}
          <div>
            <textarea
              rows={4}
              value={symptomText}
              onChange={(e) => setSymptomText(e.target.value)}
              placeholder="e.g. I have severe burning stomach pain after meals and frequent nausea..."
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm sm:text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all resize-none font-medium"
            />
          </div>

          {/* 1-Click Quick Chips */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Quick Suggestions:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_SYMPTOM_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSymptomText(chip.value);
                    setOnsetPeriod(chip.onset);
                    setSeverity(chip.severity as any);
                  }}
                  className={`p-3 text-left rounded-xl text-xs font-medium border transition-all flex items-center justify-between ${
                    symptomText === chip.value
                      ? 'bg-brand-50 border-brand-500 text-brand-800 font-bold shadow-xs ring-1 ring-brand-400'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <span>{chip.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ))}
            </div>
          </div>

          {/* Continue Button */}
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(2)}
              disabled={!symptomText.trim()}
              className="w-full sm:w-auto px-8 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-40"
            >
              Continue: Onset & Timing <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: ONSET, DURATION, SEVERITY & TIME SLOT */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-6 animate-fade-in">
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-slate-900">From when are you facing this issue?</h2>
            <p className="text-sm text-slate-500">
              Provide timing and pain details so our AI can evaluate urgency and suggest interim comfort relief if needed.
            </p>
          </div>

          {/* Question 1: Onset & Duration */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. From when did this start?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['Since Morning / Today', '2-3 Days Ago', '1-2 Weeks Ago', 'Over 1 Month (Chronic)'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setOnsetPeriod(p)}
                  className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    onsetPeriod === p
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Question 2: Pain Severity Level */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              2. How intense is the discomfort or pain?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { level: 'Mild', desc: 'Mild discomfort / manageable' },
                { level: 'Moderate', desc: 'Noticeable pain / disturbs routine' },
                { level: 'Severe', desc: 'Intense pain / needs quick relief' },
              ].map((s) => (
                <button
                  key={s.level}
                  type="button"
                  onClick={() => setSeverity(s.level as any)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    severity === s.level
                      ? 'bg-brand-50 border-brand-600 text-brand-900 font-bold ring-2 ring-brand-500 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xs font-extrabold">{s.level}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Question 3: Nature of Pain & Other Symptoms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                3. Nature of sensation:
              </label>
              <select
                value={painType}
                onChange={(e) => setPainType(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-brand-500"
              >
                <option value="Continuous / Throbbing">Continuous / Throbbing</option>
                <option value="Sharp & Piercing">Sharp & Piercing</option>
                <option value="Burning / Acidic sensation">Burning / Acidic sensation</option>
                <option value="Dull Ache / Heaviness">Dull Ache / Heaviness</option>
                <option value="Intermittent / Comes & Goes">Intermittent / Comes & Goes</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Any other symptoms (e.g. fever, nausea)?
              </label>
              <input
                type="text"
                value={associatedSymptoms}
                onChange={(e) => setAssociatedSymptoms(e.target.value)}
                placeholder="e.g. mild fever, vomiting, dizziness..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Target Date & Slot Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-brand-600" /> Preferred Consultation Date
              </label>
              <input
                type="date"
                value={appointmentDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand-600" /> Preferred Time Slot
              </label>
              <select
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-brand-500"
              >
                {['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '02:00 PM', '03:30 PM', '04:30 PM', '05:30 PM'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <button
              onClick={handleRunAiDiagnostic}
              className="px-8 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl shadow-md transition-all flex items-center gap-2 text-sm"
            >
              <Sparkles className="w-4 h-4" /> Run AI Triage & Match Specialist
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: AI DIAGNOSTIC ANIMATION */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="bg-white p-12 sm:p-16 rounded-3xl border border-slate-200 shadow-sm text-center space-y-6 animate-fade-in max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-brand-50 text-brand-600 mx-auto flex items-center justify-center animate-pulse shadow-md">
            <Sparkles className="w-8 h-8 animate-spin" style={{ animationDuration: '4s' }} />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900">Analyzing clinical symptoms & onset...</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Evaluating duration from {onsetPeriod}, assessing {severity} urgency, preparing interim comfort guidance, and matching top doctors.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-600 animate-bounce"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-bounce [animation-delay:0.2s]"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-bounce [animation-delay:0.4s]"></span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: AI TRIAGE, TEMPORARY RELIEF ADVICE & MATCHED SPECIALISTS */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div className="space-y-6 animate-fade-in">
          {/* 1. Clinical Assessment Banner */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                  AI
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Clinical Intake & Specialist Assessment
                  </h3>
                  <span className="text-xs text-slate-500">
                    Specialty: <strong className="text-brand-900">{aiTriageResult?.triage?.specialization_needed || 'Specialist Consultation'}</strong> • Onset: {aiTriageResult?.triage?.onset_and_duration || onsetPeriod}
                  </span>
                </div>
              </div>

              <span
                className={`px-3 py-1.5 rounded-full text-xs font-extrabold self-start sm:self-auto ${
                  aiTriageResult?.triage?.urgency === 'EMERGENCY'
                    ? 'bg-rose-600 text-white animate-pulse'
                    : aiTriageResult?.triage?.urgency === 'PRIORITY'
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {aiTriageResult?.triage?.urgency || 'NORMAL'} URGENCY
              </span>
            </div>

            {aiTriageResult?.message && (
              <p className="text-xs sm:text-sm text-slate-700 bg-brand-50/70 p-4 rounded-2xl border border-brand-100 leading-relaxed font-medium">
                "{aiTriageResult.message}"
              </p>
            )}
          </div>

          {/* 2. TEMPORARY INTERIM COMFORT / MEDICATION GUIDANCE WITH DISCLAIMER */}
          {aiTriageResult?.interim_relief && (
            <div className="bg-gradient-to-r from-cyan-50 via-teal-50 to-emerald-50 p-6 sm:p-7 rounded-3xl border-2 border-teal-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                    <Pill className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-teal-950">
                      Temporary Relief Advice (Until Appointment at {appointmentTime})
                    </h4>
                    <span className="text-[11px] text-teal-700 font-medium">
                      Safe over-the-counter measure for comfort management
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-200 text-teal-900 uppercase">
                  Interim Comfort
                </span>
              </div>

              {/* Remedy details */}
              <div className="p-4 bg-white/90 rounded-2xl border border-teal-100 space-y-2 text-xs text-slate-800">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-teal-900 min-w-24">Suggested:</span>
                  <span className="font-bold text-slate-900">{aiTriageResult.interim_relief.recommended_remedy}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-teal-900 min-w-24">Purpose:</span>
                  <span>{aiTriageResult.interim_relief.purpose}</span>
                </div>
                {aiTriageResult.interim_relief.safety_precautions && (
                  <div className="flex items-start gap-2 text-slate-600">
                    <span className="font-bold text-teal-900 min-w-24">Precautions:</span>
                    <span>{aiTriageResult.interim_relief.safety_precautions}</span>
                  </div>
                )}
              </div>

              {/* Prominent Medical Disclaimer Box */}
              <div className="p-3.5 bg-amber-50/90 border border-amber-300/80 rounded-2xl text-[11px] text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  Important Medical Disclaimer
                </div>
                <p className="leading-relaxed">
                  {aiTriageResult.interim_relief.disclaimer ||
                    'This temporary relief is suggested to help manage your discomfort until your appointment with the doctor. If you are willing and have no known allergies or medical restrictions, you may take this as directed. Seek immediate hospital emergency care if symptoms worsen.'}
                </p>
              </div>
            </div>
          )}

          {/* 3. Matched Doctor Cards */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Recommended Specialists ({aiTriageResult?.recommended_doctors?.length || doctors.slice(0, 3).length})
            </h4>

            <div className="space-y-3">
              {(aiTriageResult?.recommended_doctors && aiTriageResult.recommended_doctors.length > 0
                ? aiTriageResult.recommended_doctors
                : doctors.slice(0, 3).map((d) => ({
                    doctor: d,
                    match_score: 95,
                    match_reason: `Specialized in ${d.specialization}`,
                  }))
              ).map((item) => {
                const doc = item.doctor;
                const isSelected = selectedDoctor?.id === doc.id;

                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoctor(doc)}
                    className={`p-6 rounded-3xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-brand-600 bg-white shadow-lg ring-2 ring-brand-500/20'
                        : 'border-slate-200 hover:border-brand-300 bg-white hover:bg-slate-50/60 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-500 text-white flex items-center justify-center font-extrabold text-lg shadow-sm flex-shrink-0">
                          DR
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-base text-slate-900">{doc.user_name}</h4>
                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs">
                                <Check className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-brand-700 font-bold mt-0.5">{doc.specialization}</p>
                          <p className="text-[11px] text-slate-400">{doc.qualification}</p>

                          <div className="mt-2 flex items-center gap-3 text-xs">
                            <span className="text-slate-500 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-brand-600" /> ~{doc.average_consultation_time} min / consult
                            </span>
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Available
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-extrabold rounded-xl flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          {item.match_score || 95}% Match
                        </span>

                        <button
                          type="button"
                          disabled={submitting}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmBooking(doc);
                          }}
                          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {submitting ? 'Issuing...' : 'Book Token'}
                        </button>
                      </div>
                    </div>

                    {item.match_reason && (
                      <p className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 italic">
                        "{item.match_reason}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" /> Change Details
            </button>

            <button
              onClick={() => handleConfirmBooking()}
              disabled={submitting || !selectedDoctor}
              className="px-8 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-2xl shadow-lg transition-all flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {submitting ? 'Issuing Token...' : 'Confirm & Get Digital Token'}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: CONFIRMED TOKEN PASS */}
      {/* ========================================================================= */}
      {currentStep === 5 && confirmedAppointment && (
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-emerald-200 shadow-2xl space-y-8 text-center max-w-xl mx-auto animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-lg">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold uppercase tracking-wider">
              Token Issued & Live in Queue
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900">
              Appointment Confirmed!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Your appointment is registered directly with the doctor. You can track live queue status from anywhere.
            </p>
          </div>

          {/* Digital Queue Pass */}
          <div className="p-8 bg-gradient-to-br from-brand-700 via-cyan-800 to-slate-900 text-white rounded-3xl shadow-2xl space-y-6 text-left relative overflow-hidden border border-brand-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-300 flex items-center gap-1.5">
                <Activity className="w-4 h-4 animate-pulse" /> Live Patient Token
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  confirmedAppointment.token?.priority === 'EMERGENCY'
                    ? 'bg-rose-500 text-white'
                    : confirmedAppointment.token?.priority === 'PRIORITY'
                    ? 'bg-amber-400 text-slate-900'
                    : 'bg-white/20 text-white'
                }`}
              >
                {confirmedAppointment.token?.priority || 'NORMAL'} PRIORITY
              </span>
            </div>

            <div className="text-center py-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
              <span className="text-xs text-white/70 uppercase tracking-wider block">Your Token Number</span>
              <div className="text-6xl font-black font-mono tracking-tight text-white mt-1">
                {confirmedAppointment.token?.token_number || 'A-01'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-white/15">
              <div>
                <span className="text-white/60 block">Doctor</span>
                <strong className="text-white text-sm block truncate">
                  {confirmedAppointment.doctor_name || selectedDoctor?.user_name || 'Dr. Specialist'}
                </strong>
                <span className="text-cyan-200 text-[11px]">{confirmedAppointment.specialization}</span>
              </div>
              <div>
                <span className="text-white/60 block">Date & Time Slot</span>
                <strong className="text-white text-sm block">
                  {confirmedAppointment.appointment_date} @ {confirmedAppointment.appointment_time}
                </strong>
                <span className="text-emerald-300 text-[11px] font-bold">
                  ~{confirmedAppointment.token?.estimated_wait || 10} min estimated wait
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/patient/dashboard')}
              className="w-full sm:w-auto px-6 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2"
            >
              <Activity className="w-4 h-4" /> Go to Live Dashboard
            </button>
            <button
              onClick={() => {
                setConfirmedAppointment(null);
                setSymptomText('');
                setCurrentStep(1);
              }}
              className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2"
            >
              Book Another Appointment
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
