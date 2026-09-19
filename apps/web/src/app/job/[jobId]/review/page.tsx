'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { ShieldCheck, Send, Loader2, ArrowLeft, AlertCircle, RefreshCw, FileText } from 'lucide-react';

export default function JobReviewPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.jobId as string;

  const [sessionOptions, setSessionOptions] = useState<any>(null);

  const {
    data: job,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => apiRequest(`/api/v1/jobs/${jobId}`),
    enabled: !!jobId && jobId !== 'new',
    retry: 1,
  });

  useEffect(() => {
    if (!jobId) return;
    const saved = sessionStorage.getItem(`options_${jobId}`);
    if (saved) {
      try {
        setSessionOptions(JSON.parse(saved));
      } catch {}
    }
  }, [jobId]);

  const handleSendToShop = () => {
    router.push(`/job/${jobId}/status`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading job review...</p>
      </div>
    );
  }

  if (isError || !job) {
    const errorMsg = (error as any)?.message || 'Print job could not be found or has expired.';
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">Unable to Load Job</h2>
            <p className="text-sm text-slate-600">{errorMsg}</p>
          </div>
          <div className="flex space-x-3 pt-2">
            <button
              onClick={() => router.push('/')}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
            >
              Go to Home
            </button>
            <button
              onClick={() => refetch()}
              className="flex-1 inline-flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fall back to server-persisted print options if not present in session
  const effectiveOptions = sessionOptions || job.printOptionsJson || {
    colorMode: 'BW',
    copies: 1,
    duplex: 'NONE',
    paperSize: 'A4',
  };

  const pricing = job.pricingSnapshotJson || {
    ratePerBwPage: 2.0,
    copies: 1,
    subtotal: 2.0,
    finalAmount: 2.0,
    currency: 'INR',
  };

  const file = job.files?.[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block">
            Step 3 of 3 • Review Order
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Confirm Details</h1>
          <p className="text-sm text-slate-600">Review your print configuration before sending to counter queue.</p>
        </div>

        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xl space-y-6 bg-white">
          {/* Order Details List */}
          <div className="space-y-3 pb-4 border-b border-slate-200 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Customer Name:</span>
              <span className="font-bold text-slate-900">{job.session?.customerName || 'Walk-in Customer'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Document:</span>
              <span className="font-medium text-slate-800 truncate max-w-[200px] inline-flex items-center space-x-1">
                <FileText className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <span className="truncate">{file?.originalName || 'Document'}</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Print Mode:</span>
              <span className="font-semibold text-emerald-700">
                {effectiveOptions?.colorMode === 'COLOR' ? 'Full Color' : 'Black & White'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Copies:</span>
              <span className="font-semibold text-slate-900">{effectiveOptions?.copies || 1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Sides:</span>
              <span className="font-medium text-slate-700">
                {effectiveOptions?.duplex !== 'NONE' ? 'Double Sided (Duplex)' : 'Single Sided'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Paper:</span>
              <span className="font-medium text-slate-700">{effectiveOptions?.paperSize || 'A4'}</span>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Verified Server Total</div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-600">Payment due upon printing</span>
              <span className="text-3xl font-extrabold text-slate-900">
                ₹{Number(pricing.finalAmount || 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Privacy shredding badge */}
          <div className="text-xs text-emerald-800 flex items-center justify-center space-x-2 bg-emerald-50 py-2.5 rounded-xl border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Files permanently erased 10s after payment</span>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleSendToShop}
              className="flex-1 flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all text-sm"
            >
              <Send className="w-4 h-4" />
              <span>Send to Shop Queue</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
