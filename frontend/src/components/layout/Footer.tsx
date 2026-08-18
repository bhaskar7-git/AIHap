import React from 'react';
import { Activity, Heart, Shield, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
                <Activity className="w-5 h-5" />
              </div>
              <span>SmartQueue</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Predictive hospital queue management, digital tokens, and operational waiting-time intelligence for modern healthcare facilities.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">For Patients</h4>
            <ul className="space-y-2">
              <li><Link to="/patient/hospitals" className="hover:text-white transition-colors">Find Hospitals</Link></li>
              <li><Link to="/patient/doctors" className="hover:text-white transition-colors">Find Doctors</Link></li>
              <li><Link to="/patient/book-appointment" className="hover:text-white transition-colors">Book Digital Token</Link></li>
              <li><Link to="/patient/queue" className="hover:text-white transition-colors">Live Queue Tracker</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">For Hospitals</h4>
            <ul className="space-y-2">
              <li><Link to="/login" className="hover:text-white transition-colors">Doctor Console</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Admin Command Center</Link></li>
              <li><Link to="/qr-register" className="hover:text-white transition-colors">Lobby QR Kiosk</Link></li>
              <li><span className="text-slate-500">ABDM Integration (Future)</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Smart Queue USP</h4>
            <p className="text-slate-400 text-xs leading-relaxed mb-2">
              Dynamic formula: <span className="text-cyan-400 font-mono">Wait = Patients × AvgTime + Delay</span>.
            </p>
            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium">
              <Shield className="w-3.5 h-3.5" />
              Operational Efficiency Engine
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 SmartQueue System. Built for Hackathon Excellence.</p>
          <p className="flex items-center gap-1 text-slate-500">
            Powered by Smart Queue Prediction Engine
          </p>
        </div>
      </div>
    </footer>
  );
};
