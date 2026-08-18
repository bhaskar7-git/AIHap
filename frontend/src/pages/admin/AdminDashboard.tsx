import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  Layers,
  Clock,
  Activity,
  Hospital,
  Stethoscope,
  TrendingUp,
  ShieldCheck,
  BarChart3,
  RefreshCw,
  Plus
} from 'lucide-react';
import { adminApi } from '../../services/api.js';
import { AdminDashboardData } from '../../types/index.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchAdminData = async () => {
    try {
      setRefreshing(true);
      const [dashRes, statRes] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getStatistics(),
      ]);
      if (dashRes.data.success) setData(dashRes.data.data);
      if (statRes.data.success) setStats(statRes.data.data);
    } catch (err) {
      console.error('Error fetching admin dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <LoadingSpinner message="Aggregating hospital analytics & queue telemetry..." size="lg" />
      </div>
    );
  }

  const s = data?.summary;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Hospital Command Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Hospital Operations Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time multi-department queue analytics, active doctor allocations, and patient volume
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAdminData}
            className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 shadow-sm transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/admin/queues"
            className="px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-2 transition-all"
          >
            <Layers className="w-4 h-4" /> Live Queue Monitor
          </Link>
        </div>
      </div>

      {/* 6 Core Statistics KPIs (Section 12: Admin Dashboard) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400">Total Patients</span>
          <div className="text-3xl font-black text-slate-900 font-mono">{s?.totalPatientsToday || 0}</div>
          <span className="text-[10px] text-slate-500">Registered today</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400">Appointments</span>
          <div className="text-3xl font-black text-brand-700 font-mono">{s?.totalAppointments || 0}</div>
          <span className="text-[10px] text-slate-500">All bookings</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase text-amber-600">Waiting Patients</span>
          <div className="text-3xl font-black text-amber-600 font-mono">{s?.waitingPatients || 0}</div>
          <span className="text-[10px] text-amber-700">In hospital queues</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase text-emerald-600">Completed</span>
          <div className="text-3xl font-black text-emerald-600 font-mono">{s?.completedConsultations || 0}</div>
          <span className="text-[10px] text-emerald-700">Consultations done</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400">Avg Wait Time</span>
          <div className="text-3xl font-black text-brand-600 font-mono">
            {s?.averageWaitingTime || 10} <span className="text-xs font-semibold text-slate-400">min</span>
          </div>
          <span className="text-[10px] text-slate-500">Hospital average</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400">Active Doctors</span>
          <div className="text-3xl font-black text-teal-600 font-mono">{s?.activeDoctors || 0}</div>
          <span className="text-[10px] text-slate-500">In consultation</span>
        </div>
      </div>

      {/* Department Cards Section (Section 12 requirement) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Hospital className="w-5 h-5 text-brand-600" />
            Clinical Department Queues
          </h2>
          <span className="text-xs text-slate-500">{data?.departmentStats.length} Departments Active</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {data?.departmentStats.map((dept) => (
            <div
              key={dept.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      dept.status === 'High Traffic'
                        ? 'bg-rose-100 text-rose-800'
                        : dept.status === 'Moderate'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {dept.status}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">{dept.doctorCount} Docs</span>
                </div>
                <h3 className="font-bold text-base text-slate-900 mt-2">{dept.name}</h3>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Queue Size:</span>
                  <strong className="text-slate-900 font-mono">{dept.queueSize} patients</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Serving Token:</span>
                  <strong className="text-brand-700 font-mono">{dept.currentToken}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Avg Wait:</span>
                  <strong className="text-slate-800 font-mono">~{dept.averageWaitTime} min</strong>
                </div>
              </div>

              <Link
                to="/admin/queues"
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-center text-xs transition-colors"
              >
                Inspect Queue
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Hourly Traffic Simple Distribution Chart */}
      {stats?.hourlyDistribution && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand-600" />
              Hourly Patient Flow & Lobby Traffic Distribution
            </h3>
            <span className="text-xs text-slate-400">Peak hours: 10:00 AM - 11:00 AM</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-9 gap-3 items-end h-48 pt-4">
            {stats.hourlyDistribution.map((item: any) => {
              const heightPercent = Math.min(100, Math.max(15, (item.patients / 50) * 100));
              return (
                <div key={item.hour} className="flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-xs font-bold text-slate-700 font-mono">{item.patients}</span>
                  <div className="w-full bg-slate-100 rounded-xl h-36 flex items-end p-1">
                    <div
                      className="w-full bg-gradient-to-t from-brand-600 to-cyan-400 rounded-lg transition-all duration-500"
                      style={{ height: `${heightPercent}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap font-medium">{item.hour}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
