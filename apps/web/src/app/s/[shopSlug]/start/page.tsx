'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api-client';
import { User, ArrowRight, Loader2, ShieldAlert } from 'lucide-react';

export default function CustomerStartPage() {
  const params = useParams();
  const router = useRouter();
  const shopSlug = params?.shopSlug as string;

  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError('Please enter your name so the shop operator can hand you your prints.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const session = await apiRequest('/api/v1/customers/start', {
        method: 'POST',
        body: JSON.stringify({
          shopSlug,
          customerName: customerName.trim(),
          deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'Mobile Browser',
        }),
      });

      // Store in session storage
      sessionStorage.setItem('secureprint_session', JSON.stringify(session));

      // Navigate to separate upload page
      router.push(`/job/new/upload?sessionId=${session.id}&shopSlug=${shopSlug}`);
    } catch (err: any) {
      setError(err.message || 'Unable to start printing session. Please verify shop status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Who is this print for?</h1>
          <p className="text-sm text-slate-500">Enter your name so the counter operator can identify your order.</p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Your Full Name or Nickname
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Rahul Verma"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !customerName.trim()}
              className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-sm transition-all text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to Counter...</span>
                </>
              ) : (
                <>
                  <span>Continue to Document Upload</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

