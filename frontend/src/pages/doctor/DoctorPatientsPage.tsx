import React, { useState, useEffect } from 'react';
import { Users, Calendar, Clock, Search, Stethoscope, CheckCircle2 } from 'lucide-react';
import { appointmentApi } from '../../services/api.js';
import { Appointment } from '../../types/index.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

export const DoctorPatientsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    appointmentApi.getAll().then((res) => {
      if (res.data.success) {
        setAppointments(res.data.data);
      }
    }).finally(() => setLoading(false));
  }, []);

  const filtered = appointments.filter(
    (a) =>
      a.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.token?.token_number?.toLowerCase().includes(search.toLowerCase()) ||
      a.patient_phone?.includes(search)
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <LoadingSpinner message="Loading patient records..." size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Doctor Patient Registry</h1>
          <p className="text-xs sm:text-sm text-slate-500">History of all consultations, tokens, and patient visits</p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search patient or token..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase text-[11px] tracking-wider font-bold">
                <th className="py-3.5 px-4">Token</th>
                <th className="py-3.5 px-4">Patient Name</th>
                <th className="py-3.5 px-4">Contact Phone</th>
                <th className="py-3.5 px-4">Date & Slot</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map((appt) => (
                <tr key={appt.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                    {appt.token?.token_number || 'N/A'}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{appt.patient_name || 'Patient'}</td>
                  <td className="py-3.5 px-4 text-slate-500">{appt.patient_phone || '+91 98765 00000'}</td>
                  <td className="py-3.5 px-4 text-slate-700">
                    {appt.appointment_date} @ {appt.appointment_time}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{appt.appointment_type}</td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={appt.status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
