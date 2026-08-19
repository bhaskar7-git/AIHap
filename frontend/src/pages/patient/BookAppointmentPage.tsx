import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Stethoscope,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  Activity,
  AlertTriangle,
  Send,
  User,
  Bot,
  Pill,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Check,
  Mic,
  MicOff,
  Globe,
} from 'lucide-react';
import { doctorApi, appointmentApi, aiApi, TriageResponse } from '../../services/api.js';
import { Doctor, Appointment, PriorityLevel } from '../../types/index.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  triage?: TriageResponse['triage'];
  interimRelief?: TriageResponse['interim_relief'];
  recommendedDoctors?: TriageResponse['recommended_doctors'];
  quickReplies?: string[];
  timestamp: string;
}

const INITIAL_QUICK_CHIPS = [
  '🫀 Chest tightness & palpitations',
  '🌿 Red itchy skin rash for 3 days',
  '🦴 Severe knee and lower back pain',
  '🤒 102°F fever with chills & cough',
  '🤢 Burning stomach acidity after food',
  '🧠 Throbbing migraine with nausea',
  '👶 Baby running high fever',
  '👁️ Red painful eye irritation',
];

// Renders AI message content with basic markdown support (bold, bullets)
const renderMessageContent = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bullet point lines
    if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
      const content = line.trim().replace(/^[-•]\s*/, '');
      return (
        <li key={i} className="ml-3 list-disc">
          {renderInline(content)}
        </li>
      );
    }
    // Empty line as spacer
    if (line.trim() === '') return <div key={i} className="h-1" />;
    return <p key={i}>{renderInline(line)}</p>;
  });
};

const renderInline = (text: string) => {
  // Handle **bold** text
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
};

export const BookAppointmentPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // Input & Chat State
  const [inputText, setInputText] = useState<string>('');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);

  // Date & Time Slot Preferences
  const [preferredDate, setPreferredDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [preferredTime, setPreferredTime] = useState<string>('10:00 AM');

  // Booked Result
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Mic / Voice state
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState('en-IN');
  const [showLangPicker, setShowLangPicker] = useState(false);

  const VOICE_LANGUAGES = [
    { code: 'en-IN', label: '🇮🇳 English (India)' },
    { code: 'hi-IN', label: '🇮🇳 हिंदी (Hindi)' },
    { code: 'ta-IN', label: '🇮🇳 தமிழ் (Tamil)' },
    { code: 'te-IN', label: '🇮🇳 తెలుగు (Telugu)' },
    { code: 'bn-IN', label: '🇮🇳 বাংলা (Bengali)' },
    { code: 'mr-IN', label: '🇮🇳 मराठी (Marathi)' },
    { code: 'gu-IN', label: '🇮🇳 ગુજરાતી (Gujarati)' },
    { code: 'kn-IN', label: '🇮🇳 ಕನ್ನಡ (Kannada)' },
    { code: 'pa-IN', label: '🇮🇳 ਪੰਜਾਬੀ (Punjabi)' },
    { code: 'en-US', label: '🇺🇸 English (US)' },
  ];

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = voiceLang;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setInputText(transcript);
      if (event.results[event.results.length - 1].isFinal) {
        // Auto-send on final result
        setTimeout(() => handleSendMessage(transcript), 300);
      }
    };
    recognition.onerror = (e: any) => {
      console.error('Speech error:', e.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [voiceLang]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiThinking]);

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

    // Initial greeting message from Aria
    setMessages([
      {
        id: 'init-1',
        role: 'assistant',
        content:
          "👋 Hi there! I'm **Aria**, your personal health assistant here at SmartQueue.\n\nI'll chat with you for a bit to understand what's going on, and then connect you with the right doctor. So — what's been bothering you lately?",
        quickReplies: INITIAL_QUICK_CHIPS,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, []);

  // Send message to AI
  const handleSendMessage = async (textToSend?: string) => {
    const message = (textToSend || inputText).trim();
    if (!message || isAiThinking) return;

    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    setIsAiThinking(true);

    try {
      // Build conversation payload — exclude the init greeting (id: 'init-1') since it's a UI-only message
      const apiPayload = newHistory
        .filter((m) => m.id !== 'init-1')
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await aiApi.chatTriage(apiPayload, preferredDate, preferredTime, voiceLang);

      if (res.data.success) {
        const aiData = res.data.data;
        const aiMsg: MessageItem = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: aiData.message,
          triage: aiData.triage,
          interimRelief: aiData.interim_relief,
          recommendedDoctors: aiData.recommended_doctors,
          quickReplies: aiData.quick_replies,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err: any) {
      console.error('AI chat triage error:', err);
      const fallbackMsg: MessageItem = {
        id: `ai-err-${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I had a little hiccup there! 😅 Could you say that again? I'm listening.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsAiThinking(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // 1-Click Book Token
  const handleBookDoctor = async (
    doc: Doctor,
    triageInfo?: TriageResponse['triage'],
    interimAdvice?: TriageResponse['interim_relief']
  ) => {
    try {
      setSubmitting(true);

      const urgency = triageInfo?.urgency || 'NORMAL';

      const res = await appointmentApi.create({
        doctor_id: doc.id,
        appointment_date: preferredDate,
        appointment_time: preferredTime,
        appointment_type: triageInfo?.specialization_needed
          ? `${triageInfo.specialization_needed} Consultation`
          : `${doc.specialization} Consultation`,
        ai_summary: {
          chief_complaint: triageInfo?.chief_complaint || 'Consultation via AI Assistant',
          onset_and_duration: triageInfo?.onset_and_duration || 'Recent',
          severity: triageInfo?.severity || 'Moderate',
          urgency: urgency,
          interim_medication: interimAdvice?.recommended_remedy,
          notes: triageInfo?.notes || `Patient intake completed via SmartQueue AI Assistant.`,
        },
        priority: urgency as PriorityLevel,
      });

      if (res.data.success) {
        setConfirmedAppointment(res.data.data);
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
      <div className="max-w-4xl mx-auto px-4 py-16">
        <LoadingSpinner message="Initializing SmartQueue AI Clinical Assistant..." size="lg" />
      </div>
    );
  }

  // Confirmed Token Screen
  if (confirmedAppointment) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 space-y-8 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-lg">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold uppercase tracking-wider">
            Token Issued & Live in Queue
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900">Appointment Confirmed!</h2>
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
                {confirmedAppointment.doctor_name || 'Dr. Specialist'}
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
              setMessages([
                {
                  id: 'reset-1',
                  role: 'assistant',
                  content: 'Ready for another booking! What symptoms would you like to discuss?',
                  quickReplies: INITIAL_QUICK_CHIPS,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ]);
            }}
            className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2"
          >
            Book Another Consultation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 space-y-4">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-500 text-white flex items-center justify-center shadow-md flex-shrink-0">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
              AI Clinical Diagnostic & Booking Assistant
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </h1>
            <p className="text-xs text-slate-500">
              Interactive 1:1 symptom intake, interim comfort advice, and instant specialist token generation
            </p>
          </div>
        </div>

        {/* Date & Time Config in Header */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto bg-slate-50 p-1.5 rounded-2xl border border-slate-200 text-xs">
          <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-xl border border-slate-200 shadow-2xs font-semibold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-brand-600" />
            <input
              type="date"
              value={preferredDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setPreferredDate(e.target.value)}
              className="bg-transparent border-0 focus:outline-none text-xs font-bold text-slate-800"
            />
          </div>

          <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-xl border border-slate-200 shadow-2xs font-semibold text-slate-700">
            <Clock className="w-3.5 h-3.5 text-brand-600" />
            <select
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              className="bg-transparent border-0 focus:outline-none text-xs font-bold text-slate-800"
            >
              {['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '02:00 PM', '03:30 PM', '04:30 PM', '05:30 PM'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[640px] sm:h-[680px] overflow-hidden">
        {/* Chat Stream Window */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-gradient-to-b from-slate-50/50 via-white to-slate-50/30">
          {messages.map((bubble) => (
            <div
              key={bubble.id}
              className={`flex gap-3 ${bubble.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              {bubble.role === 'assistant' && (
                <div className="w-10 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-cyan-600 text-white flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 shadow-sm mt-1 tracking-wide">
                  ARIA
                </div>
              )}

              <div className="space-y-3 max-w-[90%] sm:max-w-[80%]">
                {/* Chat Bubble Message */}
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                    bubble.role === 'user'
                      ? 'bg-brand-600 text-white rounded-tr-sm font-medium'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                  }`}
                >
                  <div className="space-y-0.5">
                    {bubble.role === 'assistant'
                      ? renderMessageContent(bubble.content)
                      : <p>{bubble.content}</p>
                    }
                  </div>
                  <span
                    className={`text-[10px] block mt-1.5 ${
                      bubble.role === 'user' ? 'text-white/70 text-right' : 'text-slate-400 text-left'
                    }`}
                  >
                    {bubble.timestamp}
                  </span>
                </div>

                {/* AI Clinical Assessment Pill — only shown once intake is complete */}
                {bubble.triage && bubble.recommendedDoctors && bubble.recommendedDoctors.length > 0 && (
                  <div className="p-4 bg-brand-50/90 border border-brand-200 rounded-2xl text-xs space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-brand-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-brand-600" /> Clinical Assessment Summary
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          bubble.triage.urgency === 'EMERGENCY'
                            ? 'bg-rose-600 text-white animate-pulse'
                            : bubble.triage.urgency === 'PRIORITY'
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {bubble.triage.urgency} URGENCY
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-brand-100">
                      <div>
                        <span className="text-slate-400 block">Matched Specialty:</span>
                        <strong className="text-slate-900">{bubble.triage.specialization_needed}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Symptom Severity:</span>
                        <strong className="text-slate-900">{bubble.triage.severity || 'Moderate'}</strong>
                      </div>
                      {bubble.triage.onset_and_duration && (
                        <div className="col-span-2">
                          <span className="text-slate-400 block">Onset / Duration:</span>
                          <strong className="text-slate-900">{bubble.triage.onset_and_duration}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TEMPORARY INTERIM RELIEF & COMFORT GUIDANCE WITH DISCLAIMER */}
                {bubble.interimRelief && (
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-50 to-emerald-50 border-2 border-teal-200 rounded-2xl space-y-3 animate-fade-in text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center">
                          <Pill className="w-4 h-4" />
                        </div>
                        <h4 className="font-extrabold text-xs sm:text-sm text-teal-950">
                          Temporary Relief Advice (Before Appointment at {preferredTime})
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-200 text-teal-900 uppercase">
                        Interim Comfort
                      </span>
                    </div>

                    <div className="p-3 bg-white/90 rounded-xl border border-teal-100 space-y-1.5 text-slate-800">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-teal-900 min-w-20">Remedy:</span>
                        <span className="font-bold text-slate-900">{bubble.interimRelief.recommended_remedy}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-teal-900 min-w-20">Purpose:</span>
                        <span>{bubble.interimRelief.purpose}</span>
                      </div>
                      {bubble.interimRelief.safety_precautions && (
                        <div className="flex items-start gap-2 text-slate-600">
                          <span className="font-bold text-teal-900 min-w-20">Precaution:</span>
                          <span>{bubble.interimRelief.safety_precautions}</span>
                        </div>
                      )}
                    </div>

                    {/* Disclaimer Box */}
                    <div className="p-3 bg-amber-50/90 border border-amber-300/80 rounded-xl text-[11px] text-amber-900 space-y-0.5">
                      <div className="font-bold flex items-center gap-1.5 text-amber-950">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        Medical Disclaimer
                      </div>
                      <p className="leading-relaxed">
                        {bubble.interimRelief.disclaimer ||
                          'This temporary relief is suggested to help manage your discomfort until your appointment with the doctor. If you are willing and have no known allergies, you may take this as directed. Seek emergency care if symptoms escalate.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* MATCHED SPECIALIST DOCTOR CARDS */}
                {bubble.recommendedDoctors && bubble.recommendedDoctors.length > 0 && (
                  <div className="space-y-2.5 pt-1 animate-fade-in">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Recommended Doctors Ready for Consultation:
                    </span>
                    <div className="grid grid-cols-1 gap-2.5">
                      {bubble.recommendedDoctors.map((rec) => (
                        <div
                          key={rec.doctor.id}
                          className="p-4 sm:p-5 bg-white border-2 border-brand-200 hover:border-brand-500 rounded-2xl shadow-sm hover:shadow-md transition-all space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-500 text-white flex items-center justify-center font-bold text-base shadow-sm flex-shrink-0">
                                DR
                              </div>
                              <div>
                                <h4 className="font-bold text-sm sm:text-base text-slate-900">{rec.doctor.user_name}</h4>
                                <p className="text-xs text-brand-700 font-bold">{rec.doctor.specialization}</p>
                                <p className="text-[11px] text-slate-400">{rec.doctor.qualification}</p>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-extrabold rounded-xl flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-emerald-600" />
                              {rec.match_score || 95}% Match
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                            "{rec.match_reason}"
                          </p>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                            <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                              <Clock className="w-3.5 h-3.5 text-brand-600" /> ~{rec.doctor.average_consultation_time} min/consult
                            </span>

                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleBookDoctor(rec.doctor, bubble.triage, bubble.interimRelief)}
                              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              {submitting ? 'Generating Token...' : 'Book Digital Token'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Reply Chips */}
                {bubble.quickReplies && bubble.quickReplies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {bubble.quickReplies.map((reply, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSendMessage(reply)}
                        className="px-3 py-1.5 bg-white hover:bg-brand-50 border border-brand-200 hover:border-brand-400 text-slate-700 hover:text-brand-800 text-xs font-semibold rounded-xl shadow-2xs transition-all text-left flex items-center gap-1"
                      >
                        <span>{reply}</span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {bubble.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
          {/* AI Thinking Indicator */}
          {isAiThinking && (
            <div className="flex gap-3 justify-start items-center animate-fade-in">
              <div className="w-10 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-cyan-600 text-white flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 animate-pulse tracking-wide">
                ARIA
              </div>
              <div className="p-3.5 bg-white border border-slate-200 rounded-2xl rounded-tl-sm text-xs text-slate-600 flex items-center gap-2 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-brand-600 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.4s]"></span>
                <span className="font-semibold text-brand-900">Aria is thinking...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* BOTTOM INPUT BAR — Send + Mic + Language */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shadow-lg">
          {/* Language picker dropdown */}
          {showLangPicker && (
            <div className="absolute bottom-20 right-4 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden min-w-[210px] animate-fade-in">
              <p className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">Voice Language</p>
              {VOICE_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => { setVoiceLang(lang.code); setShowLangPicker(false); }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-brand-50 transition-colors ${
                    voiceLang === lang.code ? 'text-brand-700 bg-brand-50 font-bold' : 'text-slate-700'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 max-w-4xl mx-auto relative"
          >
            {/* Language selector button */}
            <button
              type="button"
              onClick={() => setShowLangPicker(p => !p)}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-colors flex-shrink-0"
              title="Change voice language"
            >
              <Globe className="w-4 h-4" />
            </button>

            <div className="relative flex-1 flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isListening ? '🎤 Listening...' : 'Reply to Aria...'}
                className={`w-full pl-4 pr-12 py-3.5 border rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-inner ${
                  isListening
                    ? 'bg-rose-50 border-rose-300 focus:ring-rose-400 placeholder:text-rose-400'
                    : 'bg-slate-50 border-slate-300 focus:bg-white'
                }`}
              />

              {/* Mic button inside input */}
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`absolute right-2 p-2 rounded-xl shadow-sm transition-all flex items-center justify-center ${
                  isListening
                    ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
                }`}
                title={isListening ? 'Stop listening' : `Speak in ${VOICE_LANGUAGES.find(l => l.code === voiceLang)?.label}`}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim() || isAiThinking}
              className="p-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl shadow-md transition-all flex items-center justify-center disabled:opacity-30 disabled:hover:bg-brand-600 flex-shrink-0"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>

            {/* Reset Button */}
            <button
              type="button"
              onClick={() => {
                setMessages([
                  {
                    id: `reset-${Date.now()}`,
                    role: 'assistant',
                    content: "👋 Hi again! I'm Aria. What's been bothering you today?",
                    quickReplies: INITIAL_QUICK_CHIPS,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  },
                ]);
              }}
              className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-semibold transition-colors flex-shrink-0"
              title="Reset Chat"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </form>

          {/* Language indicator */}
          {isListening && (
            <p className="text-center text-[10px] text-rose-500 font-semibold mt-1.5 animate-pulse">
              🎤 Listening in {VOICE_LANGUAGES.find(l => l.code === voiceLang)?.label} — speak now
            </p>
          )}
          {!isListening && (
            <p className="text-center text-[10px] text-slate-400 mt-1">
              🌐 Voice: {VOICE_LANGUAGES.find(l => l.code === voiceLang)?.label} · tap <Globe className="inline w-2.5 h-2.5" /> to change
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
