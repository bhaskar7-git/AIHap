import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Stethoscope, MapPin, Plus, Sparkles, Filter } from 'lucide-react';
import { appointmentApi } from '../../services/api.js';
import { Appointment } from '../../types/index.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

export const AppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async () => {
    try {
      const res = await appointmentApi.getAll();
      if (res.data.success) {
        setAppointments(res.data.data);
      }
    } catch (err) {
      console.error('Error loading appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancel = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        await appointmentApi.cancel(id);
        fetchAppointments();
      } catch (err) {
        console.error('Error cancelling appointment:', err);
      }
    }
  };

  const filtered = appointments.filter((a) => {
    if (filter === 'ACTIVE') return a.status === 'WAITING' || a.status === 'CALLED' || a.status === 'IN_CONSULTATION' || a.status === 'BOOKED';
    if (filter === 'COMPLETED') return a.status === 'COMPLETED';
    if (filter === 'CANCELLED') return a.status === 'CANCELLED' || a.status === 'NO_SHOW';
    return true;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <LoadingSpinner message="Loading appointment history..." size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">My Appointments & Digital Passes</h1>
          <p className="text-xs sm:text-sm text-slate-500">Track all past and upcoming consultations</p>
        </div>

        <Link
          to="/patient/book-appointment"
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Book New Token
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === tab
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab === 'ALL' ? 'All Records' : tab}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700">No appointments found in this category.</p>
            <Link
              to="/patient/book-appointment"
              className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline"
            >
              Book a new appointment &rarr;
            </Link>
          </div>
        ) : (
          filtered.map((appt) => (
            <div
              key={appt.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              <div className="flex items-start gap-4">
                {appt.token && (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-600 text-white flex flex-col items-center justify-center font-mono font-bold text-lg shadow-md flex-shrink-0">
                    <span className="text-[9px] uppercase tracking-wider opacity-80">Token</span>
                    <span>{appt.token.token_number}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">{appt.department_name || 'General Medicine'}</h3>
                    <StatusBadge status={appt.status} size="sm" />
                  </div>
                  <p className="text-xs text-slate-600 font-medium flex items-center gap-1">
                    <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                    {appt.doctor_name || 'Doctor'}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {appt.hospital_name || 'Hospital Facility'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs text-slate-600 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Date: <strong>{appt.appointment_date}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Slot: <strong>{appt.appointment_time}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to="/patient/queue"
                    className="px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold rounded-xl transition-colors"
                  >
                    Track Live
                  </Link>
                  {appt.status === 'WAITING' && (
                    <button
                      onClick={() => handleCancel(appt.id)}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
