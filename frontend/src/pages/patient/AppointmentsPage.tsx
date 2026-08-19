import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Calendar, Clock, Stethoscope, MapPin, Plus, Sparkles, Filter, XCircle, QrCode } from 'lucide-react';
import { appointmentApi } from '../../services/api.js';
import { Appointment } from '../../types/index.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { getScannableBaseUrl } from '../../utils/qrHelper.js';

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
      console.error('Error fetching appointments:', err);
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

  const filteredAppointments = appointments.filter((a) => {
    if (filter === 'ACTIVE') return a.status === 'WAITING' || a.status === 'BOOKED' || a.status === 'CALLED' || a.status === 'IN_CONSULTATION';
    if (filter === 'COMPLETED') return a.status === 'COMPLETED';
    if (filter === 'CANCELLED') return a.status === 'CANCELLED' || a.status === 'NO_SHOW';
    return true;
  });

  const baseUrl = getScannableBaseUrl();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">My Appointments & Token Passes</h1>
          <p className="text-xs sm:text-sm text-slate-500">Track live status or scan QR codes to cancel active tokens</p>
        </div>

        <Link
          to="/patient/book-token"
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Book New Token
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <Filter className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
        {['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
              filter === tab
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Appointment Cards List */}
      <div className="space-y-4">
        {loading ? (
          <LoadingSpinner />
        ) : filteredAppointments.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800">No Appointments Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">You have no appointments matching the selected filter category.</p>
          </div>
        ) : (
          filteredAppointments.map((appt) => {
            const cancelQrUrl = `${baseUrl}/cancel-token/${appt.id}`;
            const isCancelled = appt.status === 'CANCELLED' || appt.status === 'NO_SHOW';

            return (
              <div
                key={appt.id}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
                    {appt.token?.token_number || 'A'}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-base">{appt.department_name || 'Medical Clinic'}</h3>
                      <StatusBadge status={appt.status} size="sm" />
                    </div>
                    <p className="text-xs text-slate-600 font-medium flex items-center gap-1">
                      <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                      {appt.doctor_name || 'Doctor Specialist'}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {appt.hospital_name || 'City Care Hospital'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 text-xs text-slate-600 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
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

                  {/* Scannable Cancel Appointment QR Code */}
                  {!isCancelled && (
                    <a
                      href={cancelQrUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Scan or Click QR Code to Cancel Appointment"
                      className="p-2 bg-rose-50/60 rounded-2xl border border-rose-200 shadow-sm flex flex-col items-center hover:bg-rose-100/80 transition-all group text-center"
                    >
                      <QRCodeSVG value={cancelQrUrl} size={64} level="H" />
                      <span className="text-[9px] font-extrabold text-rose-700 group-hover:text-rose-800 mt-1 uppercase tracking-wider flex items-center gap-0.5">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        Scan to Cancel
                      </span>
                    </a>
                  )}

                  <div className="flex items-center gap-2">
                    <Link
                      to="/patient/queue"
                      className="px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold rounded-xl transition-colors"
                    >
                      Track Live
                    </Link>
                    {!isCancelled && appt.status === 'WAITING' && (
                      <button
                        onClick={() => handleCancel(appt.id)}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl transition-colors flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
