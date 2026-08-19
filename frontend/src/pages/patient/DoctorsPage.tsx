import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Stethoscope, Search, MapPin, Clock, Calendar, Sparkles, Filter } from 'lucide-react';
import { doctorApi, departmentApi } from '../../services/api.js';
import { Doctor, Department } from '../../types/index.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

export const DoctorsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [search, setSearch] = useState<string>(initialSearch);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      doctorApi.getAll(),
      departmentApi.getAll(),
    ]).then(([docRes, deptRes]) => {
      if (docRes.data.success) setDoctors(docRes.data.data);
      if (deptRes.data.success) setDepartments(deptRes.data.data);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = doctors.filter((doc) => {
    const matchesDept = selectedDept === 'ALL' || doc.department_id === selectedDept;
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      doc.user_name?.toLowerCase().includes(q) ||
      doc.specialization?.toLowerCase().includes(q) ||
      doc.department_name?.toLowerCase().includes(q) ||
      doc.hospital_name?.toLowerCase().includes(q);

    return matchesDept && matchesSearch;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <LoadingSpinner message="Searching specialists & doctors..." size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Find Specialists & Doctors</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Search by doctor name, medical department, hospital or clinical specialization
          </p>
        </div>

        {/* Global Search Bar */}
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search Cardiology, Dr. Ravi, Medicine..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
          />
        </div>
      </div>

      {/* Department Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedDept('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedDept === 'ALL'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Specializations ({doctors.length})
        </button>
        {departments.map((d) => (
          <button
            key={d.id}
            onClick={() => setSelectedDept(d.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedDept === d.id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {d.name}
          </button>
        ))}
      </div>

      {/* Doctor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-3 bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
            <Stethoscope className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700">No doctors matched your search criteria.</p>
            <p className="text-xs text-slate-400">Try searching for "Cardiology", "Medicine", or "General".</p>
          </div>
        ) : (
          filtered.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-5"
            >
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center font-black text-lg border border-brand-100 flex-shrink-0">
                    DR
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base text-slate-900 truncate">{doc.user_name}</h3>
                    <p className="text-xs font-semibold text-brand-600">{doc.specialization}</p>
                    <p className="text-[11px] text-slate-400">{doc.qualification}</p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Department:</span>
                    <strong className="text-slate-800">{doc.department_name}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Hospital:</span>
                    <strong className="text-slate-800 truncate max-w-[150px]">{doc.hospital_name}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Avg Consult:</span>
                    <strong className="text-brand-700">~{doc.average_consultation_time} min</strong>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <Link
                  to={`/patient/queue?doctor=${doc.id}`}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center transition-colors"
                >
                  Live Queue
                </Link>
                <Link
                  to="/patient/book-token"
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm hover:shadow transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Book Token
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
