import React, { useState } from 'react';
import { Stethoscope, Clock, ShieldCheck, Save, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { doctorApi } from '../../services/api.js';

export const DoctorProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const doctorId = user?.doctor?.id || user?.id || 'doc-01';

  const [avgTime, setAvgTime] = useState<number>(user?.doctor?.average_consultation_time || 5);
  const [specialization, setSpecialization] = useState<string>(user?.doctor?.specialization || 'General Physician');
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await doctorApi.update(doctorId, {
        average_consultation_time: avgTime,
        specialization,
      });
      await refreshUser();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Doctor Profile & Queue Configuration</h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Configure consultation duration parameters for the Smart Queue prediction formula
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-600 text-white flex items-center justify-center font-bold text-2xl shadow-md">
              DR
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
              <p className="text-xs text-brand-600 font-semibold">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Specialization
              </label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Average Consultation Duration (Minutes)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="2"
                  max="60"
                  value={avgTime}
                  onChange={(e) => setAvgTime(parseInt(e.target.value, 10) || 5)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-brand-700 focus:bg-white"
                />
                <span className="absolute right-3.5 top-3.5 text-xs text-slate-400 font-semibold">minutes</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Used in smart formula: <code className="font-mono text-brand-600">Wait = PatientsAhead × {avgTime} min + Delay</code>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {savedSuccess && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Changes saved and active in queue engine!
              </span>
            )}
            <button
              type="submit"
              disabled={saving}
              className="ml-auto px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Update Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
