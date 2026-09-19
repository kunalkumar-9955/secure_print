'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { Printer, CheckCircle, Clock, CreditCard, ShieldCheck, ArrowRight, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function JobStatusPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.jobId as string;

  // Poll job status every 3 seconds for real backend synchronization
  const { data: job, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => apiRequest(`/api/v1/jobs/${jobId}`),
    enabled: !!jobId && jobId !== 'new',
    refetchInterval: 3000,
  });

  const status = job?.status || 'REQUEST_SENT';
  const printingCompleted = job?.printingCompleted || false;

  const steps = [
    { key: 'REQUEST_SENT', label: 'Request Sent to Counter', desc: 'Order received by shop' },
    { key: 'SHOP_RECEIVED', label: 'Accepted by Operator', desc: 'Queued for Windows Spooler' },
    { key: 'PRINTING', label: 'Printing Document', desc: 'Physical printing in progress' },
    { key: 'PRINTING_COMPLETED', label: 'Printing Completed', desc: 'Ready for pickup & payment' },
  ];

  const getStepIndex = (st: string) => {
    switch (st) {
      case 'REQUEST_SENT':
        return 0;
      case 'SHOP_RECEIVED':
        return 1;
      case 'PRINTING':
        return 2;
      case 'PRINTING_COMPLETED':
      case 'AWAITING_PAYMENT':
      case 'PAYMENT_PENDING':
      case 'PAYMENT_SUCCESS':
      case 'CLEANUP_PENDING':
      case 'FILES_DELETED':
      case 'JOB_CLOSED':
        return 3;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(status);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <span className="text-xs text-slate-500 font-medium mt-3">Connecting to counter queue...</span>
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Job Tracking Error</h2>
          <p className="text-sm text-slate-500">
            {(error as any)?.message || 'We could not connect to this print job.'}
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Retry
            </button>
            <Link
              href="/"
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors inline-flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Live Counter Tracking</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Order #{job?.jobCode || '...'}
          </h1>
          <p className="text-sm text-slate-500">
            {printingCompleted
              ? 'Printing has finished! Please proceed to payment.'
              : 'Please wait while the shop operator prints your document.'}
          </p>
        </div>

        {/* State Machine Steps Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-6">
            {steps.map((step, idx) => {
              const isDone = idx < currentIndex || (idx === 3 && printingCompleted);
              const isCurrent = idx === currentIndex && !printingCompleted;

              return (
                <div key={step.key} className="flex items-start space-x-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isDone
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : isCurrent
                          ? 'bg-emerald-50 border-2 border-emerald-600 text-emerald-700 animate-pulse'
                          : 'bg-slate-100 border border-slate-200 text-slate-400'
                      }`}
                    >
                      {isDone ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                    </div>
                    {idx < steps.length - 1 && (
                      <div
                        className={`w-0.5 h-8 my-1 transition-all ${
                          idx < currentIndex ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </div>

                  <div className="pt-0.5">
                    <div
                      className={`text-sm font-bold ${
                        isDone || isCurrent ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{step.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pricing snapshot */}
          {job && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Total Due at Pickup:</span>
              <span className="text-xl font-extrabold text-slate-900">
                ₹{Number(job.pricingSnapshotJson?.finalAmount || 2).toFixed(2)}
              </span>
            </div>
          )}

          {/* Pay Button - Unlocked strictly when printingCompleted == true */}
          {printingCompleted ? (
            <button
              onClick={() => router.push(`/job/${jobId}/payment`)}
              className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-sm transition-all text-base animate-bounce"
            >
              <CreditCard className="w-5 h-5" />
              <span>Proceed to Payment (Online / Cash)</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Payment button unlocks automatically once printing finishes.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

