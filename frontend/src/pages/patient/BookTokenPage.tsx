import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Stethoscope, Search, Clock, Calendar, Sparkles,
  Bot, Star, Users, ChevronRight, Filter, Zap, MapPin
} from 'lucide-react';
import { doctorApi, departmentApi } from '../../services/api.js';
import { Doctor, Department } from '../../types/index.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

export const BookTokenPage: React.FC = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState(true);

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
    const matchesSearch =
      !search ||
      doc.user_name?.toLowerCase().includes(q) ||
      doc.specialization?.toLowerCase().includes(q) ||
      doc.department_name?.toLowerCase().includes(q) ||
      doc.hospital_name?.toLowerCase().includes(q);
    return matchesDept && matchesSearch;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <LoadingSpinner message="Loading available doctors..." size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-brand-700 via-brand-600 to-cyan-600 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-xl">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
              <Stethoscope className="w-7 h-7" /> Book Your Token
            </h1>
            <p className="text-white/80 text-sm max-w-md">
              Browse available specialists and book your slot instantly — or let Aria, our AI assistant, find the right doctor for you.
            </p>
          </div>

          {/* AI Chatbot CTA */}
          <button
            onClick={() => navigate('/patient/book-appointment')}
            className="group flex items-center gap-3 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/30 rounded-2xl px-5 py-4 transition-all shadow-lg hover:shadow-xl flex-shrink-0"
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

      {/* Search + Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by doctor name, specialization, hospital..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-shrink-0">
          <Users className="w-4 h-4 text-brand-400" />
          <span><strong className="text-slate-800">{filtered.length}</strong> doctors available</span>
        </div>
      </div>

      {/* Department Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setSelectedDept('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedDept === 'ALL'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All ({doctors.length})
        </button>
        {departments.map((d) => (
          <button
            key={d.id}
            onClick={() => setSelectedDept(d.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedDept === d.id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {d.name}
          </button>
        ))}
      </div>

      {/* Doctor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-3 bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4">
            <Stethoscope className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700">No doctors matched your search.</p>
            <button
              onClick={() => navigate('/patient/book-appointment')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors"
            >
              <Bot className="w-4 h-4" /> Let Aria help you find the right doctor
            </button>
          </div>
        ) : (
          filtered.map((doc) => (
            <div
              key={doc.id}
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

              {/* Info Grid */}
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

              {/* Action Buttons */}
              <div className="p-4 pt-0 flex items-center gap-2">
                <Link
                  to={`/patient/queue?doctor=${doc.id}`}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors"
                >
                  <Users className="w-3.5 h-3.5" /> Live Queue
                </Link>
                <Link
                  to={`/patient/book-appointment?doctor=${doc.id}`}
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm hover:shadow transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Book Token
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom AI Banner */}
      <div
        onClick={() => navigate('/patient/book-appointment')}
        className="cursor-pointer bg-gradient-to-r from-slate-900 to-brand-900 rounded-2xl p-5 flex items-center gap-4 hover:from-brand-900 hover:to-slate-900 transition-all shadow-lg group"
      >
        <div className="w-12 h-12 rounded-2xl bg-brand-500/20 border border-brand-400/30 flex items-center justify-center flex-shrink-0">
          <Bot className="w-6 h-6 text-brand-300" />
        </div>
        <div className="flex-1">
          <p className="text-white font-bold text-sm">Not sure which specialist to choose?</p>
          <p className="text-slate-400 text-xs">Aria, our AI health assistant, will chat with you and recommend the perfect doctor based on your symptoms.</p>
        </div>
        <ChevronRight className="w-5 h-5 text-brand-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
      </div>
    </div>
  );
};
