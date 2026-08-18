import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Stethoscope,
  ShieldCheck,
  Building2,
  Clock,
  Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { hospitalApi, departmentApi } from '../services/api.js';
import { Hospital, Department, UserRole } from '../types/index.js';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  // Role Selection
  const [role, setRole] = useState<UserRole>('PATIENT');

  // Common Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Doctor Specific Fields
  const [specialization, setSpecialization] = useState('');
  const [qualification, setQualification] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [avgConsultationTime, setAvgConsultationTime] = useState(10);

  // Admin Specific Field
  const [adminPasscode, setAdminPasscode] = useState('');

  // Data
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load hospitals for doctor registration
    hospitalApi.getAll().then((res) => {
      if (res.data.success && res.data.data.length > 0) {
        setHospitals(res.data.data);
        setHospitalId(res.data.data[0].id);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (hospitalId) {
      departmentApi.getAll(hospitalId).then((res) => {
        if (res.data.success && res.data.data.length > 0) {
          setDepartments(res.data.data);
          setDepartmentId(res.data.data[0].id);
        }
      }).catch(() => {});
    }
  }, [hospitalId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !password) {
      setError('Please fill in all required basic fields.');
      return;
    }

    if (role === 'DOCTOR' && (!specialization || !qualification)) {
      setError('Please enter specialization and qualification for doctor registration.');
      return;
    }

    if (role === 'ADMIN' && adminPasscode !== 'ADMIN2026' && adminPasscode !== 'Admin@123') {
      setError('Invalid Admin authorization passcode. Use "Admin@123" for demo setup.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const extraData = role === 'DOCTOR' ? {
        specialization,
        qualification,
        hospital_id: hospitalId,
        department_id: departmentId,
        average_consultation_time: avgConsultationTime,
      } : {};

      await register(name, email, phone, password, role, extraData);

      if (role === 'PATIENT') navigate('/patient/dashboard');
      else if (role === 'DOCTOR') navigate('/doctor/dashboard');
      else if (role === 'ADMIN') navigate('/admin/dashboard');
      else navigate('/');
    } catch (err: any) {
      setError(err?.message || err?.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-500 text-white mx-auto flex items-center justify-center shadow-lg">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Create {role === 'DOCTOR' ? 'Doctor' : role === 'ADMIN' ? 'Hospital Admin' : 'Patient'} Account
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {role === 'DOCTOR'
              ? 'Manage consultation queues, live tokens & patient appointments'
              : role === 'ADMIN'
              ? 'Configure hospital departments, doctor rosters & monitor real-time queue flow'
              : 'Book instant OPD tokens, track live wait time & skip physical waiting lines'}
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="p-1.5 bg-slate-100 rounded-2xl flex gap-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setRole('PATIENT')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              role === 'PATIENT'
                ? 'bg-white text-brand-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4 text-cyan-600" />
            Patient
          </button>
          <button
            type="button"
            onClick={() => setRole('DOCTOR')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              role === 'DOCTOR'
                ? 'bg-white text-brand-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-4 h-4 text-brand-600" />
            Doctor
          </button>
          <button
            type="button"
            onClick={() => setRole('ADMIN')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              role === 'ADMIN'
                ? 'bg-white text-brand-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Admin
          </button>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Common Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={role === 'DOCTOR' ? 'e.g. Dr. Ravi Kumar' : 'e.g. Ananya Sharma'}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={role === 'DOCTOR' ? 'dr.ravi@hospital.com' : 'user@example.com'}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Create Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Doctor Specific Section */}
            {role === 'DOCTOR' && (
              <div className="pt-2 border-t border-slate-100 space-y-4">
                <div className="text-xs font-bold text-brand-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4" />
                  Doctor Credentials & Practice Info
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Specialization
                    </label>
                    <div className="relative">
                      <Award className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        placeholder="e.g. Cardiologist / General Physician"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Qualifications
                    </label>
                    <div className="relative">
                      <Award className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={qualification}
                        onChange={(e) => setQualification(e.target.value)}
                        placeholder="e.g. MBBS, MD (Medicine)"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Hospital
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <select
                        value={hospitalId}
                        onChange={(e) => setHospitalId(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
                      >
                        {hospitals.map((h) => (
                          <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Department
                    </label>
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Avg Time (Mins)
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="number"
                        min="2"
                        max="60"
                        value={avgConsultationTime}
                        onChange={(e) => setAvgConsultationTime(Number(e.target.value))}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Specific Section */}
            {role === 'ADMIN' && (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Admin Authorization Passcode
                </div>
                <div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      value={adminPasscode}
                      onChange={(e) => setAdminPasscode(e.target.value)}
                      placeholder="Enter Admin authorization passcode (e.g. Admin@123)"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">For demo purposes, use passcode: <strong className="text-slate-600">Admin@123</strong></p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? 'Setting up Account...' : `Register as ${role === 'DOCTOR' ? 'Doctor' : role === 'ADMIN' ? 'Admin' : 'Patient'}`}
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-brand-600 hover:text-brand-700">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
