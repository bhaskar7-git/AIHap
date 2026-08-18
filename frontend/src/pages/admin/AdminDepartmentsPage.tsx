import React, { useState, useEffect } from 'react';
import { Layers, Plus, Activity } from 'lucide-react';
import { departmentApi, hospitalApi } from '../../services/api.js';
import { Department, Hospital } from '../../types/index.js';
import { Modal } from '../../components/common/Modal.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

export const AdminDepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [deptRes, hospRes] = await Promise.all([
        departmentApi.getAll(),
        hospitalApi.getAll(),
      ]);
      if (deptRes.data.success) setDepartments(deptRes.data.data);
      if (hospRes.data.success) {
        setHospitals(hospRes.data.data);
        if (hospRes.data.data.length > 0) setHospitalId(hospRes.data.data[0].id);
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

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !hospitalId) return;
    try {
      setSubmitting(true);
      await departmentApi.create({ hospital_id: hospitalId, name, description });
      await fetchData();
      setIsModalOpen(false);
      setName('');
      setDescription('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <LoadingSpinner message="Loading clinical departments..." size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Department Management</h1>
          <p className="text-xs sm:text-sm text-slate-500">Configure medical departments and OPD divisions</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Department
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {departments.map((d) => (
          <div key={d.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold">
                <Activity className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-mono text-slate-400">ID: {d.id}</span>
            </div>
            <h3 className="font-bold text-base text-slate-900">{d.name}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{d.description}</p>
          </div>
        ))}
      </div>

      {/* Add Department Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Clinical Department">
        <form onSubmit={handleCreateDepartment} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Hospital
            </label>
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
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Department Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Neurology, Oncology"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Primary scope of clinical care..."
              rows={3}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
            />
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
              {submitting ? 'Saving...' : 'Add Department'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
