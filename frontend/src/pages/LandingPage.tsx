import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Clock,
  Sparkles,
  Layers,
  ShieldCheck,
  Smartphone,
  Hospital,
  Stethoscope,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Users,
  Bell,
  QrCode,
  Zap,
  TrendingDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  const getDashboardLink = () => {
    if (!isAuthenticated) return '/login';
    if (user?.role === 'DOCTOR') return '/doctor/dashboard';
    if (user?.role === 'ADMIN') return '/admin/dashboard';
    return '/patient/dashboard';
  };

  return (
    <div className="space-y-24 pb-20">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Background gradient decorative shapes */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-tr from-cyan-100/60 via-brand-50/40 to-teal-50/60 blur-3xl -z-10 rounded-full"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold tracking-wide shadow-sm">
                <Sparkles className="w-4 h-4 text-brand-600 animate-pulse" />
                CLINICAL AI TRIAGE & 1:1 DOCTOR QUEUE
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                Direct 1:1 Doctor Care.{' '}
                <span className="bg-gradient-to-r from-brand-600 via-cyan-600 to-teal-500 bg-clip-text text-transparent">
                  Zero Waiting Lines.
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Describe your symptoms to our intelligent AI clinical assistant to get matched with specialized doctors, receive live digital tokens, and know exactly when to arrive.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  to={isAuthenticated ? '/patient/book-appointment' : '/register'}
                  className="w-full sm:w-auto px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/35 transition-all flex items-center justify-center gap-2 text-base group"
                >
                  <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  Book Appointment
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  to="/patient/queue"
                  className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex items-center justify-center gap-2 text-base"
                >
                  <Layers className="w-4 h-4 text-cyan-600" />
                  Track Live Queue
                </Link>
              </div>

              {/* Trust badging */}
              <div className="pt-6 border-t border-slate-200/80 grid grid-cols-3 gap-4 text-left">
                <div>
                  <p className="text-2xl font-extrabold text-slate-900">70%</p>
                  <p className="text-xs text-slate-500">Less Lobby Congestion</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-brand-600">&lt; 1 sec</p>
                  <p className="text-xs text-slate-500">Real-Time Sync</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-teal-600">100%</p>
                  <p className="text-xs text-slate-500">Remote Queue Visibility</p>
                </div>
              </div>
            </div>

            {/* Right Interactive Mock Queue Card */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden transform hover:-translate-y-1 transition-all duration-300">
                {/* Live Banner */}
                <div className="bg-gradient-to-r from-brand-600 to-cyan-600 p-4 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping"></span>
                    <span className="font-bold text-xs tracking-wider uppercase">Live Consultation Room</span>
                  </div>
                  <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-medium">Room 204</span>
                </div>

                <div className="p-6 space-y-6">
                  {/* Doctor Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-lg">
                      DR
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Dr. Ravi Kumar</h4>
                      <p className="text-xs text-slate-500">General Medicine • City Care Hospital</p>
                    </div>
                  </div>

                  {/* Token Status Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Current in Room</span>
                      <div className="text-3xl font-extrabold text-slate-900 mt-1">A-21</div>
                      <span className="text-[10px] text-brand-600 font-medium">In consultation</span>
                    </div>

                    <div className="p-4 bg-brand-50 border border-brand-200 rounded-2xl">
                      <span className="text-[10px] uppercase font-bold text-brand-600">Your Token</span>
                      <div className="text-3xl font-extrabold text-brand-700 mt-1">A-27</div>
                      <span className="text-[10px] text-slate-600 font-medium">6 ahead (30 min)</span>
                    </div>
                  </div>

                  {/* Smart Prediction Bar */}
                  <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-cyan-400 font-bold flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" /> Smart Queue Prediction
                      </span>
                      <span className="text-slate-300 font-semibold">5 min / patient</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-cyan-400 to-brand-400 h-full w-2/3 rounded-full"></div>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      You are recommended to reach at <strong className="text-white">10:00 AM</strong>
                    </p>
                  </div>

                  <div className="text-center pt-1">
                    <Link
                      to="/login"
                      className="text-xs font-bold text-brand-600 hover:text-brand-700 underline"
                    >
                      Try Live Interactive Demo &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 CORE BENEFITS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-extrabold text-brand-600 uppercase tracking-wider">
            Operational Breakthrough
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
            3 Core Pillars of SmartQueue
          </h2>
          <p className="text-slate-600 text-base">
            Engineered to eliminate crowded waiting rooms and streamline hospital workflow from lobby to doctor desk.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Benefit 1 */}
          <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 space-y-4 group">
            <div className="w-14 h-14 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Smartphone className="w-7 h-7" />
            </div>
            <div className="text-xs font-bold text-cyan-600 uppercase tracking-wider">Pillar 01</div>
            <h3 className="text-xl font-bold text-slate-900">Digital Token Generation</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              No paper slips. Patients receive an encrypted digital pass with sequential token number, QR code verification, and instant slot locking.
            </p>
            <ul className="space-y-2 text-xs text-slate-500 pt-2">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Sequential doctor tokens (e.g. A-21, A-22)</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Instant QR check-in & kiosk registration</li>
            </ul>
          </div>

          {/* Benefit 2 */}
          <div className="p-8 bg-white rounded-3xl border border-brand-200 shadow-md hover:shadow-xl transition-all duration-300 space-y-4 group relative overflow-hidden">
            <div className="absolute top-0 right-0 px-3 py-1 bg-brand-600 text-white text-[10px] font-bold uppercase rounded-bl-xl">
              Main USP
            </div>
            <div className="w-14 h-14 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Zap className="w-7 h-7" />
            </div>
            <div className="text-xs font-bold text-brand-600 uppercase tracking-wider">Pillar 02</div>
            <h3 className="text-xl font-bold text-slate-900">Smart Waiting-Time Prediction</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Dynamically calculates wait times based on live patients ahead, doctor consultation speed, and delay adjustments.
            </p>
            <ul className="space-y-2 text-xs text-slate-500 pt-2">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Dynamic formula: Patients × AvgTime + Delay</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Remote waiting – arrive only when needed</li>
            </ul>
          </div>

          {/* Benefit 3 */}
          <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 space-y-4 group">
            <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Activity className="w-7 h-7" />
            </div>
            <div className="text-xs font-bold text-teal-600 uppercase tracking-wider">Pillar 03</div>
            <h3 className="text-xl font-bold text-slate-900">Real-Time Queue Updates</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              When doctors click "CALL NEXT", Socket.IO instantly notifies all connected patients and updates waiting room screens without refresh.
            </p>
            <ul className="space-y-2 text-xs text-slate-500 pt-2">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Live WebSocket event broadcasts</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Proactive "You Are Next" audio-visual alerts</li>
            </ul>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="bg-slate-100/70 py-20 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-extrabold text-brand-600 uppercase tracking-wider">Step-by-Step Flow</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">How SmartQueue Works</h2>
            <p className="text-slate-600 text-sm sm:text-base">
              A frictionless 4-step journey designed for maximum patient convenience and operational precision.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Select Doctor & Time',
                desc: 'Choose hospital, department, and doctor. Select suitable date and time slot.',
                icon: Calendar,
              },
              {
                step: '02',
                title: 'Get Digital Token',
                desc: 'Receive your unique token number (e.g. A-27) with dynamic wait prediction.',
                icon: QrCode,
              },
              {
                step: '03',
                title: 'Track Queue Remotely',
                desc: 'Wait at home or cafe. Watch live progress as the doctor serves preceding tokens.',
                icon: Layers,
              },
              {
                step: '04',
                title: 'Arrive When Called',
                desc: 'Receive urgent alert: "🚨 YOU ARE NEXT". Proceed directly to Room 204.',
                icon: Stethoscope,
              },
            ].map((s, idx) => {
              const Icon = s.icon;
              return (
                <div key={idx} className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm relative space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-brand-600 font-mono">{s.step}</span>
                    <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">{s.title}</h4>
                  <p className="text-slate-500 text-xs leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* VALUE FOR DIFFERENT STAKEHOLDERS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-extrabold text-brand-600 uppercase tracking-wider">Multi-Role Architecture</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Tailored for Every Stakeholder</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* For Patients */}
          <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">For Patients</h3>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Zero physical standing in long morning queues</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Real-time notifications when only 2 patients remain</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Lobby QR kiosk fast-track registration</span>
              </li>
            </ul>
          </div>

          {/* For Doctors */}
          <div className="p-8 bg-white rounded-3xl border border-brand-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
              <Stethoscope className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">For Doctors</h3>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>1-Click "CALL NEXT" consultation workflow</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Emergency and Priority queue reordering</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>No-Show tracking and automatic wait adjustment</span>
              </li>
            </ul>
          </div>

          {/* For Hospitals & Admins */}
          <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <Hospital className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">For Hospitals & Admins</h3>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Live multi-department queue occupancy monitor</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Hospital, department, and doctor management</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Analytics on patient wait times & consultation speeds</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* QUICK DEMO CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2 max-w-xl text-center md:text-left">
            <h3 className="text-2xl sm:text-3xl font-extrabold">Ready to experience SmartQueue?</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Test with pre-seeded demo accounts for Patient, Doctor, and Admin with 1 click.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login"
              className="px-6 py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition-all shadow-md"
            >
              Sign In Demo Accounts
            </Link>
            <Link
              to="/qr-register"
              className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" /> Lobby QR Kiosk
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
