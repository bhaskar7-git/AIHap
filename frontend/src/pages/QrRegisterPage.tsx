import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Link, useNavigate } from 'react-router-dom';
import {
  QrCode,
  Printer,
  Smartphone,
  ArrowRight,
  ShieldCheck,
  Activity,
  XCircle,
  Search,
  CheckCircle2,
  Ticket
} from 'lucide-react';
import { getScannableBaseUrl } from '../utils/qrHelper.js';

export const QrRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'GET_TOKEN' | 'CANCEL_TOKEN'>('GET_TOKEN');
  const [searchTokenId, setSearchTokenId] = useState('');

  const currentOrigin = getScannableBaseUrl();
  const registrationUrl = `${currentOrigin}/patient/book-token`;

  const handlePrint = () => {
    window.print();
  };

  const handleScanOrSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTokenId.trim()) return;
    navigate(`/token-pass/${searchTokenId.trim()}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Top Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 border border-brand-200 text-brand-700 rounded-full text-xs font-bold uppercase tracking-wider">
          <QrCode className="w-3.5 h-3.5" />
          SmartQueue QR Kiosk Portal
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
          Digital Token QR Hub
        </h1>
        <p className="text-slate-600 text-sm max-w-lg mx-auto">
          Scan QR codes from any mobile device to issue new digital tokens or manage and cancel existing active tokens.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center border-b border-slate-200">
        <div className="flex gap-2 p-1.5 bg-slate-200/60 rounded-2xl">
          <button
            onClick={() => setActiveTab('GET_TOKEN')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'GET_TOKEN'
                ? 'bg-white text-brand-700 shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Ticket className="w-4 h-4" />
            1. Scan QR to Get Token
          </button>
          <button
            onClick={() => setActiveTab('CANCEL_TOKEN')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'CANCEL_TOKEN'
                ? 'bg-white text-rose-700 shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <XCircle className="w-4 h-4" />
            2. Scan QR to Cancel Token
          </button>
        </div>
      </div>

      {/* TAB 1: GET DIGITAL TOKEN QR */}
      {activeTab === 'GET_TOKEN' && (
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-8 max-w-xl mx-auto print:shadow-none print:border-none">
          {/* Hospital Branding */}
          <div className="flex items-center justify-center gap-2 text-slate-900 font-extrabold text-xl">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
              <Activity className="w-5 h-5" />
            </div>
            <span>SmartQueue • City Care Hospital OPD</span>
          </div>

          {/* Big Scannable QR Code */}
          <div className="p-8 bg-slate-50 border-2 border-dashed border-brand-300 rounded-3xl inline-block shadow-inner">
            <QRCodeSVG value={registrationUrl} size={220} level="H" includeMargin={true} />
            <p className="text-xs font-bold text-slate-700 mt-3 font-mono">{registrationUrl}</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900">Skip Reception Waiting Lines</h3>
            <div className="grid grid-cols-3 gap-3 text-left pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <span className="font-bold text-brand-600 block mb-1">1. Scan QR</span>
                Point smartphone camera at this code
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <span className="font-bold text-brand-600 block mb-1">2. Pick Doctor</span>
                Select department & doctor slot
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <span className="font-bold text-brand-600 block mb-1">3. Get Pass</span>
                Receive live token pass & alerts
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-slate-100 print:hidden">
            <button
              onClick={handlePrint}
              className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Printer className="w-4 h-4" /> Print Reception Kiosk Poster
            </button>
            <Link
              to="/patient/book-token"
              className="w-full sm:w-auto px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Smartphone className="w-4 h-4" /> Book Token Directly
            </Link>
          </div>
        </div>
      )}

      {/* TAB 2: CANCEL TOKEN VIA QR / PASS ID */}
      {activeTab === 'CANCEL_TOKEN' && (
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 sm:p-12 space-y-8 max-w-xl mx-auto">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Cancel Active Digital Token</h2>
            <p className="text-slate-500 text-xs sm:text-sm">
              Scan the QR code printed on your digital token pass or enter your Appointment ID to view and cancel your queue position.
            </p>
          </div>

          {/* Form to enter / scan token pass */}
          <form onSubmit={handleScanOrSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Enter Appointment / Token Pass ID
              </label>
              <div className="relative">
                <Ticket className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchTokenId}
                  onChange={(e) => setSearchTokenId(e.target.value)}
                  placeholder="e.g. appt-101 or token-01"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Search className="w-4 h-4" /> Open Token Pass to Cancel
            </button>
          </form>

          {/* Instruction Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> How scanning works:
            </h4>
            <ul className="list-disc pl-4 space-y-1">
              <td>Open your smartphone camera.</td>
              <td>Point it directly at the QR code on your Digital Token Pass card.</td>
              <td>Tap the popup URL to view live status and click <strong>Cancel Token</strong>.</td>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
