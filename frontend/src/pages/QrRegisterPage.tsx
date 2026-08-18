import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';
import { QrCode, Printer, Smartphone, ArrowRight, ShieldCheck, Activity } from 'lucide-react';

export const QrRegisterPage: React.FC = () => {
  const currentOrigin = window.location.origin;
  const registrationUrl = `${currentOrigin}/register?source=lobby_qr`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 border border-brand-200 text-brand-700 rounded-full text-xs font-bold uppercase tracking-wider">
          <QrCode className="w-3.5 h-3.5" />
          Hospital Lobby Kiosk Display
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Scan to Register & Get Digital Token</h1>
        <p className="text-slate-600 text-sm max-w-lg mx-auto">
          Display this screen or print it as a standee poster for hospital reception counters and OPD waiting lobbies.
        </p>
      </div>

      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-8 max-w-xl mx-auto print:shadow-none print:border-none">
        {/* Hospital Branding on Poster */}
        <div className="flex items-center justify-center gap-2 text-slate-900 font-extrabold text-xl">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
            <Activity className="w-5 h-5" />
          </div>
          <span>SmartQueue • City Care Hospital</span>
        </div>

        {/* Big QR Code */}
        <div className="p-8 bg-slate-50 border-2 border-dashed border-brand-300 rounded-3xl inline-block shadow-inner">
          <QRCodeSVG value={registrationUrl} size={220} level="H" includeMargin={true} />
          <p className="text-xs font-bold text-slate-700 mt-3 font-mono">{registrationUrl}</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-bold text-slate-900">Skip Physical Queue in 3 Easy Steps</h3>
          <div className="grid grid-cols-3 gap-3 text-left pt-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <span className="font-bold text-brand-600 block mb-1">1. Scan QR</span>
              Point camera from any smartphone
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <span className="font-bold text-brand-600 block mb-1">2. Pick Doctor</span>
              Choose department & slot
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <span className="font-bold text-brand-600 block mb-1">3. Track Live</span>
              Wait remotely with alerts
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-slate-100 print:hidden">
          <button
            onClick={handlePrint}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-sm"
          >
            <Printer className="w-4 h-4" /> Print Kiosk Poster
          </button>
          <Link
            to="/register"
            className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-sm"
          >
            <Smartphone className="w-4 h-4" /> Open Registration Directly
          </Link>
        </div>
      </div>
    </div>
  );
};
