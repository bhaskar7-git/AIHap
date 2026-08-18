import React, { useState, useEffect } from 'react';
import { Stethoscope, Plus, MapPin, Clock, Search } from 'lucide-react';
import { doctorApi, hospitalApi, departmentApi } from '../../services/api.js';
import { Doctor, Hospital, Department } from '../../types/index.js';
import { Modal } from '../../components/common/Modal.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

export const AdminDoctorsPage: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('Doctor@123');
  const [hospitalId, setHospitalId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [qualification, setQualification] = useState('');
  const [avgTime, setAvgTime] = useState<number>(8);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [docRes, hospRes, deptRes] = await Promise.all([
        doctorApi.getAll(),
        hospitalApi.getAll(),
        departmentApi.getAll(),
      ]);
      if (docRes.data.success) setDoctors(docRes.data.data);
      if (hospRes.data.success) {
        setHospitals(hospRes.data.data);
        if (hospRes.data.data.length > 0) setHospitalId(hospRes.data.data[0].id);
      }
      if (deptRes.data.success) {
        setDepartments(deptRes.data.data);
        if (deptRes.data.data.length > 0) setDepartmentId(deptRes.data.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !hospitalId || !departmentId) return;
    try {
      setSubmitting(true);
      await doctorApi.create({
        name,
        email,
        phone,
        password,
        hospital_id: hospitalId,
        department_id: departmentId,
        specialization: specialization || 'Specialist',
        qualification: qualification || 'MBBS, MD',
        average_consultation_time: avgTime,
      });
      await fetchData();
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <LoadingSpinner message="Loading doctor directory..." size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Medical Doctor Management</h1>
          <p className="text-xs sm:text-sm text-slate-500">Register and manage doctors across hospital departments</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Doctor Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {doctors.map((doc) => (
          <div key={doc.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-base flex-shrink-0">
                DR
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">{doc.user_name}</h3>
                <p className="text-xs font-semibold text-brand-600">{doc.specialization}</p>
                <p className="text-[11px] text-slate-400">{doc.qualification}</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Dept:</span>
                <strong className="text-slate-800">{doc.department_name}</strong>
              </div>
              <div className="flex justify-between">
                <span>Hospital:</span>
                <strong className="text-slate-800 truncate max-w-[150px]">{doc.hospital_name}</strong>
              </div>
              <div className="flex justify-between">
                <span>Avg Consult:</span>
                <strong className="text-brand-700 font-mono">~{doc.average_consultation_time} min</strong>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Doctor Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Doctor Staff" maxWidth="max-w-xl">
        <form onSubmit={handleCreateDoctor} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Doctor Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Rajesh Gupta"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rajesh@hospital.com"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Phone</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Temporary Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Hospital</label>
              <select
                value={hospitalId}
                onChange={(e) => setHospitalId(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Avg Time (min)</label>
              <input
                type="number"
                min="2"
                max="60"
                value={avgTime}
                onChange={(e) => setAvgTime(parseInt(e.target.value, 10) || 5)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-brand-700 focus:bg-white"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Specialization</label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="Senior Consultant Internist"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs shadow-md disabled:opacity-50"
            >
              {submitting ? 'Creating Doctor...' : 'Save Doctor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
