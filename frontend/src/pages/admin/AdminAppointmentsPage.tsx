import React, { useState, useEffect } from 'react';
import { Calendar, Search, Stethoscope, MapPin, Trash2, Filter } from 'lucide-react';
import { appointmentApi } from '../../services/api.js';
import { Appointment } from '../../types/index.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

export const AdminAppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAppts = async () => {
    try {
      const res = await appointmentApi.getAll();
      if (res.data.success) {
        setAppointments(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppts();
  }, []);

  const handleCancel = async (id: string) => {
    if (window.confirm('Cancel this patient appointment?')) {
      try {
        await appointmentApi.cancel(id);
        fetchAppts();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filtered = appointments.filter(
    (a) =>
      a.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.doctor_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.token?.token_number?.toLowerCase().includes(search.toLowerCase()) ||
      a.department_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <LoadingSpinner message="Loading hospital appointment records..." size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Hospital Appointment Central Log</h1>
          <p className="text-xs sm:text-sm text-slate-500">Cross-department appointment ledger and token registry</p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search token, patient, doctor..."
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
                <th className="py-3.5 px-4">Patient</th>
                <th className="py-3.5 px-4">Doctor & Department</th>
                <th className="py-3.5 px-4">Date & Slot</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-brand-700">
                    {a.token?.token_number || 'N/A'}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{a.patient_name || 'Patient'}</div>
                    <div className="text-[11px] text-slate-400">{a.patient_phone}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-800">{a.doctor_name}</div>
                    <div className="text-[11px] text-slate-500">{a.department_name}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    {a.appointment_date} @ {a.appointment_time}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge priority={a.token?.priority || 'NORMAL'} size="sm" />
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={a.status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {a.status === 'WAITING' && (
                      <button
                        onClick={() => handleCancel(a.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Cancel Appointment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
