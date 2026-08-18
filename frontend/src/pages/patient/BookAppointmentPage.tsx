import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Hospital,
  Stethoscope,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Activity,
  Layers,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { hospitalApi, departmentApi, doctorApi, appointmentApi } from '../../services/api.js';
import { Hospital as HospitalType, Department, Doctor, Appointment } from '../../types/index.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

export const BookAppointmentPage: React.FC = () => {
  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Data lists
  const [hospitals, setHospitals] = useState<HospitalType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // Selection states
  const [selectedHospital, setSelectedHospital] = useState<HospitalType | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('10:00 AM');
  const [appointmentType, setAppointmentType] = useState<string>('General Consultation');

  // Booked result
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  // Available time slots
  const timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
    '04:00 PM', '04:30 PM', '05:00 PM'
  ];

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [hospRes, docRes] = await Promise.all([
          hospitalApi.getAll(),
          doctorApi.getAll(),
        ]);
        if (hospRes.data.success) {
          setHospitals(hospRes.data.data);
          if (hospRes.data.data.length > 0) {
            setSelectedHospital(hospRes.data.data[0]);
          }
        }
        if (docRes.data.success) {
          setDoctors(docRes.data.data);
        }
      } catch (err) {
        console.error('Error fetching booking data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // When hospital changes, fetch departments
  useEffect(() => {
    if (selectedHospital) {
      departmentApi.getAll(selectedHospital.id).then((res) => {
        if (res.data.success) {
          setDepartments(res.data.data);
          if (res.data.data.length > 0) {
            setSelectedDepartment(res.data.data[0]);
          }
        }
      });
    }
  }, [selectedHospital]);

  // Filter doctors based on selected department
  const filteredDoctors = doctors.filter(
    (d) => !selectedDepartment || d.department_id === selectedDepartment.id
  );

  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) return;

    try {
      setSubmitting(true);
      const res = await appointmentApi.create({
        doctor_id: selectedDoctor.id,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        appointment_type: appointmentType,
      });

      if (res.data.success) {
        setConfirmedAppointment(res.data.data);
        setStep(5); // Confirmation screen
        
        // Trigger celebratory confetti!
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#0891b2', '#06b6d4', '#10b981', '#3b82f6'],
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to book appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <LoadingSpinner message="Loading hospital booking services..." size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Wizard Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 border border-brand-200 text-brand-700 rounded-full text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          Smart Digital Appointment & Token Wizard
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Book Digital Token</h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
          Choose hospital, department, and doctor to generate your sequential queue token instantly.
        </p>
      </div>

      {/* Progress Steps Indicators (1 to 4) */}
      {step <= 4 && (
        <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-2xl mx-auto">
          {[
            { num: 1, label: 'Hospital' },
            { num: 2, label: 'Department' },
            { num: 3, label: 'Doctor' },
            { num: 4, label: 'Date & Time' },
          ].map((s) => (
            <div
              key={s.num}
              className={`p-3 rounded-2xl border text-center transition-all ${
                step === s.num
                  ? 'bg-brand-600 text-white border-brand-600 shadow-md font-bold'
                  : step > s.num
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                  : 'bg-white text-slate-400 border-slate-200'
              }`}
            >
              <div className="text-xs font-bold font-mono">0{s.num}</div>
              <div className="text-xs hidden sm:block truncate mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* STEP 1: SELECT HOSPITAL */}
      {step === 1 && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 animate-fade-in">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Hospital className="w-5 h-5 text-brand-600" />
            Select Hospital Facility
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {hospitals.map((hosp) => (
              <div
                key={hosp.id}
                onClick={() => setSelectedHospital(hosp)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  selectedHospital?.id === hosp.id
                    ? 'border-brand-600 bg-brand-50/50 shadow-md ring-2 ring-brand-500'
                    : 'border-slate-200 hover:border-brand-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold mb-3">
                  <Hospital className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">{hosp.name}</h4>
                <p className="text-xs text-slate-500 mt-1">{hosp.address}, {hosp.city}</p>
                <p className="text-[11px] text-brand-600 font-medium mt-2">{hosp.phone}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(2)}
              disabled={!selectedHospital}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-sm disabled:opacity-50"
            >
              Continue to Departments <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SELECT DEPARTMENT */}
      {step === 2 && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-600" />
              Select Department
            </h2>
            <span className="text-xs text-slate-500">Hospital: <strong>{selectedHospital?.name}</strong></span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {departments.map((dept) => (
              <div
                key={dept.id}
                onClick={() => setSelectedDepartment(dept)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  selectedDepartment?.id === dept.id
                    ? 'border-brand-600 bg-brand-50/50 shadow-md ring-2 ring-brand-500'
                    : 'border-slate-200 hover:border-brand-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-base text-slate-900">{dept.name}</h4>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 font-semibold">
                    OPD Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{dept.description}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => {
                if (filteredDoctors.length > 0) {
                  setSelectedDoctor(filteredDoctors[0]);
                }
                setStep(3);
              }}
              disabled={!selectedDepartment}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-sm disabled:opacity-50"
            >
              Choose Specialist Doctor <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: SELECT DOCTOR */}
      {step === 3 && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-brand-600" />
              Select Doctor
            </h2>
            <span className="text-xs text-slate-500">Dept: <strong>{selectedDepartment?.name}</strong></span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredDoctors.length === 0 ? (
              <div className="col-span-2 p-8 text-center text-slate-400 bg-slate-50 rounded-2xl">
                No doctors registered under this department currently.
              </div>
            ) : (
              filteredDoctors.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoctor(doc)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    selectedDoctor?.id === doc.id
                      ? 'border-brand-600 bg-brand-50/50 shadow-md ring-2 ring-brand-500'
                      : 'border-slate-200 hover:border-brand-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center font-bold text-base flex-shrink-0">
                      DR
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-base text-slate-900 truncate">{doc.user_name}</h4>
                      <p className="text-xs text-slate-600 font-medium">{doc.specialization}</p>
                      <p className="text-[11px] text-slate-400">{doc.qualification}</p>
                      <div className="mt-3 flex items-center gap-3 text-[11px]">
                        <span className="text-brand-700 font-semibold bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">
                          ~{doc.average_consultation_time} min / consult
                        </span>
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Available
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={!selectedDoctor}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-sm disabled:opacity-50"
            >
              Select Date & Slot <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SELECT DATE & TIME & REVIEW */}
      {step === 4 && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 animate-fade-in">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-600" />
            Select Appointment Date & Time Slot
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Picker */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Appointment Date
              </label>
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />

              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider pt-2">
                Consultation Type
              </label>
              <select
                value={appointmentType}
                onChange={(e) => setAppointmentType(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-brand-500"
              >
                <option value="General Consultation">General Consultation</option>
                <option value="Follow-up Review">Follow-up Review</option>
                <option value="Diagnostic Test Review">Diagnostic Test Review</option>
                <option value="Specialist Opinion">Specialist Opinion</option>
              </select>
            </div>

            {/* Time Slot Picker */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Available Time Slots
              </label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                      selectedTime === slot
                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Booking Summary Box */}
          <div className="p-5 bg-gradient-to-r from-brand-50 to-cyan-50 border border-brand-200 rounded-2xl space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-brand-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Appointment Summary & Token Preview
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Hospital</span>
                <strong className="text-slate-800">{selectedHospital?.name}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Department</span>
                <strong className="text-slate-800">{selectedDepartment?.name}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Doctor</span>
                <strong className="text-brand-700">{selectedDoctor?.user_name}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Date & Time</span>
                <strong className="text-slate-800">{selectedDate} @ {selectedTime}</strong>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(3)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleConfirmBooking}
              disabled={submitting}
              className="px-8 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {submitting ? 'Generating Digital Token...' : 'Confirm & Issue Digital Token'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: CONFIRMATION SUCCESS */}
      {step === 5 && confirmedAppointment && (
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-emerald-200 shadow-2xl space-y-8 text-center max-w-xl mx-auto animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-lg">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Appointment Confirmed!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Your digital patient token has been generated sequentially into the live queue.
            </p>
          </div>

          {/* Big Token Pass Box */}
          <div className="p-6 bg-gradient-to-br from-brand-600 via-cyan-700 to-teal-700 text-white rounded-3xl shadow-xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-200">Official Queue Token</span>
            <div className="text-5xl font-black tracking-tight font-mono">
              {confirmedAppointment.token?.token_number || 'A-27'}
            </div>
            <div className="pt-2 border-t border-white/20 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-white/70 block">Doctor</span>
                <strong className="text-white">{confirmedAppointment.doctor_name || selectedDoctor?.user_name}</strong>
              </div>
              <div>
                <span className="text-white/70 block">Estimated Wait</span>
                <strong className="text-emerald-300 font-bold">{confirmedAppointment.token?.estimated_wait || 25} min</strong>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/patient/dashboard')}
              className="w-full sm:w-auto px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2"
            >
              <Activity className="w-4 h-4" /> Go to Live Dashboard
            </button>
            <button
              onClick={() => navigate('/patient/queue')}
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2"
            >
              <Layers className="w-4 h-4" /> View Full Queue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
