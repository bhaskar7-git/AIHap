import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { SocketProvider } from './context/SocketContext.js';
import { NotificationProvider } from './context/NotificationContext.js';

// Layout Components
import { Navbar } from './components/layout/Navbar.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { MobileNav } from './components/layout/MobileNav.js';
import { Footer } from './components/layout/Footer.js';

// Guards
import { ProtectedRoute, RoleProtectedRoute } from './components/common/ProtectedRoute.js';

// Public Pages
import { LandingPage } from './pages/LandingPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { QrRegisterPage } from './pages/QrRegisterPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';

// Patient Pages
import { PatientDashboard } from './pages/patient/PatientDashboard.js';
import { HospitalsPage } from './pages/patient/HospitalsPage.js';
import { DoctorsPage } from './pages/patient/DoctorsPage.js';
import { BookAppointmentPage } from './pages/patient/BookAppointmentPage.js';
import { LiveQueuePage } from './pages/patient/LiveQueuePage.js';
import { AppointmentsPage } from './pages/patient/AppointmentsPage.js';
import { ProfilePage } from './pages/patient/ProfilePage.js';

// Doctor Pages
import { DoctorDashboard } from './pages/doctor/DoctorDashboard.js';
import { DoctorQueuePage } from './pages/doctor/DoctorQueuePage.js';
import { DoctorPatientsPage } from './pages/doctor/DoctorPatientsPage.js';
import { DoctorProfilePage } from './pages/doctor/DoctorProfilePage.js';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard.js';
import { AdminQueuesPage } from './pages/admin/AdminQueuesPage.js';
import { AdminHospitalsPage } from './pages/admin/AdminHospitalsPage.js';
import { AdminDepartmentsPage } from './pages/admin/AdminDepartmentsPage.js';
import { AdminDoctorsPage } from './pages/admin/AdminDoctorsPage.js';
import { AdminPatientsPage } from './pages/admin/AdminPatientsPage.js';
import { AdminAppointmentsPage } from './pages/admin/AdminAppointmentsPage.js';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <div className="flex-1 flex w-full">
        <Sidebar />
        <main className="flex-1 w-full pb-16 md:pb-0">{children}</main>
      </div>
      <MobileNav />
      <Footer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <AppLayout>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/qr-register" element={<QrRegisterPage />} />
                
                {/* Public / Search Accessible */}
                <Route path="/patient/hospitals" element={<HospitalsPage />} />
                <Route path="/patient/doctors" element={<DoctorsPage />} />
                <Route path="/patient/queue" element={<LiveQueuePage />} />

                {/* Patient Role Protected Routes */}
                <Route element={<RoleProtectedRoute allowedRoles={['PATIENT']} />}>
                  <Route path="/patient/dashboard" element={<PatientDashboard />} />
                  <Route path="/patient/book-appointment" element={<BookAppointmentPage />} />
                  <Route path="/patient/appointments" element={<AppointmentsPage />} />
                  <Route path="/patient/profile" element={<ProfilePage />} />
                </Route>

                {/* Doctor Role Protected Routes */}
                <Route element={<RoleProtectedRoute allowedRoles={['DOCTOR']} />}>
                  <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
                  <Route path="/doctor/queue" element={<DoctorQueuePage />} />
                  <Route path="/doctor/patients" element={<DoctorPatientsPage />} />
                  <Route path="/doctor/profile" element={<DoctorProfilePage />} />
                </Route>

                {/* Admin Role Protected Routes */}
                <Route element={<RoleProtectedRoute allowedRoles={['ADMIN']} />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/queues" element={<AdminQueuesPage />} />
                  <Route path="/admin/hospitals" element={<AdminHospitalsPage />} />
                  <Route path="/admin/departments" element={<AdminDepartmentsPage />} />
                  <Route path="/admin/doctors" element={<AdminDoctorsPage />} />
                  <Route path="/admin/patients" element={<AdminPatientsPage />} />
                  <Route path="/admin/appointments" element={<AdminAppointmentsPage />} />
                </Route>

                {/* 404 Route */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </AppLayout>
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
