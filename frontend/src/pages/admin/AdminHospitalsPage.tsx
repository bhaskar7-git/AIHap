import React, { useState, useEffect } from 'react';
import { Hospital as HospitalIcon, Plus, MapPin, Phone, Search } from 'lucide-react';
import { hospitalApi } from '../../services/api.js';
import { Hospital } from '../../types/index.js';
import { Modal } from '../../components/common/Modal.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

export const AdminHospitalsPage: React.FC = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchHospitals = async () => {
    try {
      const res = await hospitalApi.getAll();
      if (res.data.success) {
        setHospitals(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address || !city || !phone) return;
    try {
      setSubmitting(true);
      await hospitalApi.create({ name, address, city, phone });
      await fetchHospitals();
      setIsModalOpen(false);
      setName('');
      setAddress('');
      setCity('');
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
        <LoadingSpinner message="Loading hospital registry..." size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Hospital Facilities Management</h1>
          <p className="text-xs sm:text-sm text-slate-500">Register and manage connected hospital centers</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> Add New Hospital
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {hospitals.map((h) => (
          <div key={h.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
              <HospitalIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">{h.name}</h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {h.address}, {h.city}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {h.phone}
              </span>
              <span className="font-mono text-[11px] text-slate-400">ID: {h.id}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Hospital Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register New Hospital Facility">
        <form onSubmit={handleCreateHospital} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Hospital Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Metro Super Specialty Hospital"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Address
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="12 Health City Expressway"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                City
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Bangalore"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 80 1234 5678"
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
              {submitting ? 'Saving...' : 'Create Hospital'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
