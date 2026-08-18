import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Stethoscope,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Activity,
  ShieldAlert,
  Send,
  User,
  Bot,
  Layers,
  Award,
  AlertTriangle,
  Flame,
  Search,
  MessageSquareHeart,
  ChevronRight
} from 'lucide-react';
import { doctorApi, appointmentApi, aiApi, TriageResponse } from '../../services/api.js';
import { Doctor, Appointment, PriorityLevel } from '../../types/index.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

interface ChatBubble {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  triageData?: TriageResponse['triage'];
  recommendedDoctors?: TriageResponse['recommended_doctors'];
  quickReplies?: string[];
  timestamp: string;
}

const QUICK_SYMPTOM_PROMPTS = [
  '🫀 Chest tightness & shortness of breath',
  '🌿 Itchy red skin patches for 4 days',
  '🦴 Severe lower back and knee pain',
  '🤒 High fever with body aches & chills',
  '👶 Child running fever & persistent cough',
  '🧠 Severe throbbing migraine & nausea',
];

export const BookAppointmentPage: React.FC = () => {
  const navigate = useNavigate();

  // Mode: 'AI_CHAT' (Default) vs 'MANUAL_DIRECTORY'
  const [bookingMode, setBookingMode] = useState<'AI_CHAT' | 'MANUAL_DIRECTORY'>('AI_CHAT');

  // Loading & State
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // AI Chat State
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [preferredDate, setPreferredDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [preferredTime, setPreferredTime] = useState<string>('10:00 AM');
  const [chatHistory, setChatHistory] = useState<ChatBubble[]>([]);

  // Manual Booking State
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('ALL');

  // Confirmed Result
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isAiThinking]);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await doctorApi.getAll();
        if (res.data.success) {
          setDoctors(res.data.data);
          if (res.data.data.length > 0) {
            setSelectedDoctor(res.data.data[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching doctors:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();

    // Initial greeting from SmartQueue AI
    setChatHistory([
      {
        id: 'init-1',
        role: 'assistant',
        content:
          "👋 Hello! I'm **SmartQueue AI**, your direct medical triage and doctor matching assistant.\n\nTell me what symptoms, pain, or health concerns you are experiencing today, and I will analyze your case, determine urgency, and match you directly with our specialized doctors.",
        quickReplies: QUICK_SYMPTOM_PROMPTS,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const message = (textToSend || inputMessage).trim();
    if (!message || isAiThinking) return;

    const userBubble: ChatBubble = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...chatHistory, userBubble];
    setChatHistory(newHistory);
    setInputMessage('');
    setIsAiThinking(true);

    try {
      // Build API messages payload
      const apiPayload = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await aiApi.chatTriage(apiPayload, preferredDate, preferredTime);

      if (res.data.success) {
        const aiData = res.data.data;
        const aiBubble: ChatBubble = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: aiData.message,
          triageData: aiData.triage,
          recommendedDoctors: aiData.recommended_doctors,
          quickReplies: aiData.quick_replies,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setChatHistory((prev) => [...prev, aiBubble]);
      }
    } catch (err: any) {
      console.error('AI chat error:', err);
      const errorBubble: ChatBubble = {
        id: `ai-err-${Date.now()}`,
        role: 'assistant',
        content:
          "I'm reviewing our specialist roster for you. You can select any of our doctors below or try typing again:",
        recommendedDoctors: doctors.slice(0, 2).map((d) => ({
          doctor: d,
          match_score: 92,
          match_reason: `Available for ${d.specialization} consultations`,
        })),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatHistory((prev) => [...prev, errorBubble]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleDirectBook = async (
    doc: Doctor,
    triageInfo?: TriageResponse['triage'],
    urgencyPriority?: PriorityLevel
  ) => {
    try {
      setSubmitting(true);

      const res = await appointmentApi.create({
        doctor_id: doc.id,
        appointment_date: preferredDate,
        appointment_time: preferredTime,
        appointment_type: triageInfo?.specialization_needed
          ? `${triageInfo.specialization_needed} Consultation`
          : `${doc.specialization} Consultation`,
        ai_summary: triageInfo
          ? {
              chief_complaint: triageInfo.chief_complaint,
              duration: triageInfo.duration,
              severity: triageInfo.severity,
              urgency: triageInfo.urgency || urgencyPriority || 'NORMAL',
              notes: triageInfo.notes,
            }
          : undefined,
        priority: urgencyPriority || triageInfo?.urgency || 'NORMAL',
      });

      if (res.data.success) {
        setConfirmedAppointment(res.data.data);
        confetti({
          particleCount: 120,
          spread: 70,
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

  // Specialties for manual filter
  const allSpecialties = ['ALL', ...Array.from(new Set(doctors.map((d) => d.specialization)))];

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      doc.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpec = selectedSpecialty === 'ALL' || doc.specialization === selectedSpecialty;
    return matchesSearch && matchesSpec;
  });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <LoadingSpinner message="Connecting to Groq AI & Clinical Specialist Directory..." size="lg" />
      </div>
    );
  }

  // If appointment booked, show rich Confirmation Token Screen
  if (confirmedAppointment) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 space-y-8 animate-fade-in text-center">
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-lg">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold uppercase tracking-wider">
            Booking Confirmed & Token Issued
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900">Your Digital Token is Live</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Your appointment is registered directly with the doctor. You can track live queue progress in real-time.
          </p>
        </div>

        {/* Big Digital Queue Pass */}
        <div className="p-8 bg-gradient-to-br from-brand-700 via-cyan-800 to-slate-900 text-white rounded-3xl shadow-2xl space-y-6 text-left relative overflow-hidden border border-brand-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-300 flex items-center gap-1.5">
              <Activity className="w-4 h-4 animate-pulse" /> Live Patient Pass
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
            <span className="text-xs text-white/70 uppercase tracking-wider block">Token Number</span>
            <div className="text-6xl font-black font-mono tracking-tight text-white mt-1">
              {confirmedAppointment.token?.token_number || 'A-01'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-white/15">
            <div>
              <span className="text-white/60 block">Consulting Doctor</span>
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
                ~{confirmedAppointment.token?.estimated_wait || 15} min estimated wait
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
              setChatHistory([
                {
                  id: 'reset-1',
                  role: 'assistant',
                  content: 'Ready for another booking! What symptoms would you like to discuss?',
                  quickReplies: QUICK_SYMPTOM_PROMPTS,
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
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 border border-brand-200 text-brand-700 rounded-full text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            Groq AI Clinical Triage & 1:1 Doctor Match
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Book Doctor Consultation</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Tell our AI assistant your symptoms to get matched with the right specialist and receive an instant queue token.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 self-start md:self-auto">
          <button
            onClick={() => setBookingMode('AI_CHAT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              bookingMode === 'AI_CHAT'
                ? 'bg-white text-brand-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bot className="w-4 h-4 text-brand-600" />
            AI Smart Match
          </button>
          <button
            onClick={() => setBookingMode('MANUAL_DIRECTORY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              bookingMode === 'MANUAL_DIRECTORY'
                ? 'bg-white text-brand-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-4 h-4 text-cyan-600" />
            Doctor Directory
          </button>
        </div>
      </div>

      {/* MODE 1: GROQ AI CONVERSATIONAL BOOKING (PRIMARY) */}
      {bookingMode === 'AI_CHAT' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Stream Window (Col 1 & 2) */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
            {/* Chat Top Bar */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-500 text-white flex items-center justify-center shadow-md">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    SmartQueue AI Assistant
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">Powered by Groq High-Speed Llama 3</span>
                </div>
              </div>

              {/* Date & Time Slot Quick Chips */}
              <div className="hidden sm:flex items-center gap-2">
                <input
                  type="date"
                  value={preferredDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                />
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                >
                  {['09:00 AM', '10:00 AM', '11:30 AM', '02:00 PM', '04:00 PM', '05:30 PM'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-5 bg-gradient-to-b from-slate-50/40 to-white">
              {chatHistory.map((bubble) => (
                <div
                  key={bubble.id}
                  className={`flex gap-3 ${bubble.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {bubble.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm mt-1">
                      AI
                    </div>
                  )}

                  <div className="space-y-3 max-w-[85%]">
                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                        bubble.role === 'user'
                          ? 'bg-brand-600 text-white rounded-tr-sm'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                      }`}
                    >
                      <div className="whitespace-pre-line font-normal">{bubble.content}</div>
                      <span
                        className={`text-[10px] block mt-1.5 ${
                          bubble.role === 'user' ? 'text-white/70 text-right' : 'text-slate-400 text-left'
                        }`}
                      >
                        {bubble.timestamp}
                      </span>
                    </div>

                    {/* Triage Urgency Badge (if analyzed by AI) */}
                    {bubble.triageData && (
                      <div className="p-3.5 bg-brand-50/80 border border-brand-200 rounded-2xl text-xs space-y-1.5 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-brand-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-brand-600" /> AI Clinical Assessment
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              bubble.triageData.urgency === 'EMERGENCY'
                                ? 'bg-rose-600 text-white animate-pulse'
                                : bubble.triageData.urgency === 'PRIORITY'
                                ? 'bg-amber-500 text-white'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {bubble.triageData.urgency}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                          <div>
                            <span className="text-slate-400 block">Recommended Field:</span>
                            <strong className="text-brand-900">{bubble.triageData.specialization_needed}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Symptom Severity:</span>
                            <strong className="text-slate-800">{bubble.triageData.severity || 'Moderate'}</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Interactive Recommended Doctor Cards */}
                    {bubble.recommendedDoctors && bubble.recommendedDoctors.length > 0 && (
                      <div className="space-y-2.5 pt-1 animate-fade-in">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                          Recommended Matching Specialists:
                        </span>
                        <div className="grid grid-cols-1 gap-2.5">
                          {bubble.recommendedDoctors.map((rec) => (
                            <div
                              key={rec.doctor.id}
                              className="p-4 bg-white border-2 border-brand-200 hover:border-brand-500 rounded-2xl shadow-sm hover:shadow-md transition-all space-y-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                                    DR
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-sm text-slate-900">{rec.doctor.user_name}</h4>
                                    <p className="text-xs text-brand-700 font-semibold">{rec.doctor.specialization}</p>
                                    <p className="text-[11px] text-slate-400">{rec.doctor.qualification}</p>
                                  </div>
                                </div>
                                <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold rounded-lg flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-emerald-600" />
                                  {rec.match_score || 95}% Match
                                </span>
                              </div>

                              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                                "{rec.match_reason}"
                              </p>

                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-brand-600" /> ~{rec.doctor.average_consultation_time} min/consult
                                </span>

                                <button
                                  type="button"
                                  disabled={submitting}
                                  onClick={() => handleDirectBook(rec.doctor, bubble.triageData, bubble.triageData?.urgency)}
                                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  {submitting ? 'Issuing...' : 'Book Digital Token'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Suggestion Chips */}
                    {bubble.quickReplies && bubble.quickReplies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {bubble.quickReplies.map((reply, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSendMessage(reply)}
                            className="px-3 py-1.5 bg-white hover:bg-brand-50 border border-brand-200 hover:border-brand-300 text-slate-700 hover:text-brand-700 text-xs font-medium rounded-xl shadow-2xs transition-all text-left"
                          >
                            {reply}
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

              {/* AI Thinking Animation */}
              {isAiThinking && (
                <div className="flex gap-3 justify-start items-center">
                  <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 animate-pulse">
                    AI
                  </div>
                  <div className="p-3.5 bg-white border border-slate-200 rounded-2xl rounded-tl-sm text-xs text-slate-500 flex items-center gap-2 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-brand-600 animate-bounce"></span>
                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]"></span>
                    <span>Analyzing symptoms & matching specialist doctors...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-4 bg-white border-t border-slate-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Describe symptoms (e.g., severe migraine for 3 days with nausea)..."
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isAiThinking}
                  className="px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 text-xs sm:text-sm"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Ask AI</span>
                </button>
              </form>
            </div>
          </div>

          {/* Quick Date/Time & Live Doctors Sidebar (Col 3) */}
          <div className="space-y-4">
            {/* Preferred Slot Config Box */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-brand-600" /> Target Date & Slot
              </h4>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Appointment Date</label>
                <input
                  type="date"
                  value={preferredDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Time Slot Preference</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {['09:00 AM', '10:30 AM', '02:00 PM', '04:30 PM'].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setPreferredTime(slot)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                        preferredTime === slot
                          ? 'bg-brand-600 text-white border-brand-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Registered Doctors Quick Preview */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-brand-600" /> Direct Doctors ({doctors.length})
                </span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">Live</span>
              </h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {doctors.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 bg-slate-50 hover:bg-brand-50/60 border border-slate-200/80 rounded-2xl transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs text-slate-900">{d.user_name}</h5>
                      <span className="text-[10px] text-brand-700 font-bold bg-white px-2 py-0.5 rounded-md border border-brand-200">
                        {d.specialization}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{d.qualification}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">~{d.average_consultation_time} min/patient</span>
                      <button
                        type="button"
                        onClick={() => handleDirectBook(d)}
                        className="text-[11px] text-brand-600 hover:text-brand-700 font-bold flex items-center gap-0.5"
                      >
                        1-Click Book <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: DIRECT MANUAL DOCTOR DIRECTORY */}
      {bookingMode === 'MANUAL_DIRECTORY' && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="relative sm:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search doctor by name or specialization (e.g. Dr. Priya, Cardiology)..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>

              <div>
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {allSpecialties.map((s) => (
                    <option key={s} value={s}>
                      {s === 'ALL' ? 'All Medical Specialties' : s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Doctor Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDoctors.map((doc) => (
              <div
                key={doc.id}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-500 text-white flex items-center justify-center font-bold text-base shadow-sm">
                      DR
                    </div>
                    <span className="px-2.5 py-1 bg-brand-50 text-brand-700 text-xs font-bold rounded-lg border border-brand-100">
                      {doc.specialization}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-base text-slate-900">{doc.user_name}</h4>
                    <p className="text-xs text-slate-500">{doc.qualification}</p>
                    <p className="text-xs text-slate-400 mt-1">{doc.department_name || 'General OPD'}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Avg Consultation</span>
                    <strong className="text-slate-800">~{doc.average_consultation_time} mins</strong>
                  </div>

                  <button
                    onClick={() => handleDirectBook(doc)}
                    disabled={submitting}
                    className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Book Direct Token
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
