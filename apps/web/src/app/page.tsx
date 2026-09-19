import Link from 'next/link';
import { Printer, ShieldCheck, Zap, QrCode, Monitor, ArrowRight, Lock } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      {/* Header Navigation */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold shadow-sm">
              <Printer className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              SecurePrint
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors px-3.5 py-2 rounded-xl hover:bg-slate-100"
            >
              Sign In
            </Link>
            <Link
              href="/s/apex-digital"
              className="inline-flex items-center space-x-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl shadow-sm transition-all"
            >
              <span>Customer Demo</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold uppercase tracking-wider shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Zero-Trust Privacy SaaS for Print Shops</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Contactless Printing for Cyber Cafes & Photocopy Centers.
          </h1>

          <p className="text-lg text-slate-600 leading-relaxed">
            Customers scan your shop's permanent QR code, upload documents, and track jobs live on their phones.
            Documents print directly through the native Windows Print Agent and are permanently wiped 10 seconds after verified payment.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/s/apex-digital"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3.5 rounded-xl shadow-sm transition-all text-base"
            >
              <QrCode className="w-5 h-5" />
              <span>Scan Shop QR Demo</span>
            </Link>
            <Link
              href="/admin"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-white hover:bg-slate-50 text-slate-800 font-semibold px-8 py-3.5 rounded-xl border border-slate-300 shadow-sm transition-all text-base"
            >
              <Monitor className="w-5 h-5 text-slate-600" />
              <span>Shop Dashboard</span>
            </Link>
            <Link
              href="/super-admin"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-3.5 rounded-xl shadow-sm transition-all text-sm"
            >
              <span>Super Admin</span>
            </Link>
          </div>
        </div>

        {/* 3 Feature Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">One Permanent QR Code</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Print once and mount on your shop counter. Customers scan using Google Lens, iPhone Camera, or WhatsApp to start printing immediately without downloading an app.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
              <Monitor className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Native Windows Spooler Agent</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Pairs in 5 seconds with a 6-digit code. Direct integration with Windows Print Spooler (`System.Printing`) automatically routes jobs to local and network printers.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shadow-sm">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">10-Second Auto Cleanup</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              No customer document lingers on your PC. As soon as online or counter cash payment is verified, the server permanently deletes private files after a 10-second delay.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 space-y-4 sm:space-y-0">
          <div>© 2026 SecurePrint Technologies. Production Multi-Tenant Cloud Architecture.</div>
          <div className="flex items-center space-x-6">
            <span>Timezone: Asia/Kolkata</span>
            <span>Security: SHA-256 HMAC Webhooks</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

