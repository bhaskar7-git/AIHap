import React, { useState, useEffect } from 'react';
import {
  Users, Calendar, Clock, Search, Stethoscope,
  CheckCircle2, RefreshCw, Activity, Phone, AlertCircle
} from 'lucide-react';
import { appointmentApi } from '../../services/api.js';
import { Appointment } from '../../types/index.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

const TABS = ['ALL', 'WAITING', 'COMPLETED', 'CANCELLED'] as const;

export const DoctorPatientsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchAppointments = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await appointmentApi.getAll();
      if (res.data.success) {
        setAppointments(res.data.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load patient records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAppointments(); }, []);

  // Filter by status tab then by search
  const tabFiltered = activeTab === 'ALL'
    ? appointments
    : appointments.filter(a => a.status === activeTab);

  const filtered = tabFiltered.filter(a =>
    !search ||
    a.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    String(a.token?.token_number ?? '').includes(search) ||
    a.patient_phone?.includes(search) ||
    a.appointment_type?.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const total = appointments.length;
  const waiting = appointments.filter(a => a.status === 'WAITING' || a.status === 'CALLED').length;
  const completed = appointments.filter(a => a.status === 'COMPLETED').length;
  const today = new Date().toISOString().split('T')[0];
  const todayCount = appointments.filter(a => a.appointment_date === today).length;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <LoadingSpinner message="Loading patient records..." size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-7 h-7 text-brand-600" /> Patient Registry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            All consultations, tokens, and patient visits assigned to you
          </p>
        </div>
        <button
          onClick={() => fetchAppointments(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm shadow-sm transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ─── Stats Row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Patients', value: total, icon: Users, color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-200' },
          { label: 'Today', value: todayCount, icon: Calendar, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
          { label: 'Waiting', value: waiting, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
          { label: 'Completed', value: completed, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} border ${stat.border} rounded-2xl p-4 flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Filters Row ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Tab pills */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                activeTab === tab
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab === 'ALL' ? `All (${total})` : `${tab} (${appointments.filter(a => a.status === tab).length})`}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 w-full sm:max-w-xs ml-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search patient, token, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* ─── Error ───────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-sm text-rose-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
          {error}
        </div>
      )}

      {/* ─── Table ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Users className="w-14 h-14 text-slate-200 mx-auto" />
            <p className="font-bold text-slate-600 text-base">
              {search || activeTab !== 'ALL' ? 'No matching patients found.' : 'No patient records yet.'}
            </p>
            <p className="text-xs text-slate-400">
              {search || activeTab !== 'ALL'
                ? 'Try clearing your search or changing the filter.'
                : 'Once patients book appointments with you, they will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase text-[10px] tracking-widest font-bold">
                  <th className="py-4 px-5">Token #</th>
                  <th className="py-4 px-5">Patient Name</th>
                  <th className="py-4 px-5">Contact</th>
                  <th className="py-4 px-5">Date & Slot</th>
                  <th className="py-4 px-5">Type</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5">Est. Wait</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 border border-brand-200 rounded-lg font-black text-brand-800 font-mono text-sm">
                        #{appt.token?.token_number ?? '—'}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {(appt.patient_name || 'P').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-900">{appt.patient_name || 'Patient'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {appt.patient_phone || '—'}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-slate-700 font-medium">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{appt.appointment_date}</span>
                        <span className="text-xs text-slate-400">{appt.appointment_time}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-slate-500 max-w-[160px] truncate" title={appt.appointment_type}>
                      {appt.appointment_type || 'Consultation'}
                    </td>
                    <td className="py-4 px-5">
                      <StatusBadge status={appt.status} size="sm" />
                    </td>
                    <td className="py-4 px-5 text-slate-500">
                      {appt.token?.estimated_wait != null
                        ? <span className="text-brand-700 font-bold">~{appt.token.estimated_wait} min</span>
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-400 font-medium">
              Showing {filtered.length} of {total} records
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
