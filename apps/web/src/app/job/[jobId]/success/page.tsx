'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { CheckCircle2, Trash2, FileText, ArrowRight, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function JobSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.jobId as string;

  const [countdown, setCountdown] = useState(10);
  const [confettiFired, setConfettiFired] = useState(false);

  // Poll job status to detect when status transitions to FILES_DELETED
  const { data: job, isLoading, isError, error } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => apiRequest(`/api/v1/jobs/${jobId}`),
    enabled: !!jobId && jobId !== 'new',
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (!confettiFired) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      setConfettiFired(true);
    }
  }, [confettiFired]);

  // Visual 10-second countdown syncing with server-side BullMQ deletion
  useEffect(() => {
    if (countdown > 0 && job?.status !== 'FILES_DELETED') {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, job]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <span className="text-xs text-slate-500 font-medium mt-3">Verifying receipt status...</span>
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Job Not Found</h2>
          <p className="text-sm text-slate-500">
            {(error as any)?.message || 'We could not retrieve details for this order.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-sm"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // Non-negotiable security: If payment is not verified, do not render success
  if (job.paymentStatus !== 'SUCCESS') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl text-center space-y-4 border border-red-200 shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Payment Unverified</h2>
          <p className="text-sm text-slate-500">
            Payment for this job has not been verified by the server.
          </p>
          <button
            onClick={() => router.push(`/job/${jobId}/payment`)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm"
          >
            Go to Payment
          </button>
        </div>
      </div>
    );
  }

  const isDeleted = job.status === 'FILES_DELETED' || countdown === 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-center">
          {/* Success Badge */}
          <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Payment Verified</h1>
            <p className="text-sm text-slate-500">Order #{job.jobCode} is fully settled.</p>
          </div>

          {/* 10-Second Deletion Status Bar */}
          <div
            className={`p-4 rounded-xl border text-left space-y-2 transition-all ${
              isDeleted
                ? 'bg-slate-50 border-slate-200 text-slate-600'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
              <span className="flex items-center space-x-1.5">
                {isDeleted ? (
                  <>
                    <Trash2 className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-900">Files Permanently Deleted</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Preparing Secure File Deletion</span>
                  </>
                )}
              </span>
              {!isDeleted && <span className="font-mono text-emerald-700">{countdown}s</span>}
            </div>

            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full transition-all duration-1000 ease-linear"
                style={{ width: `${Math.max(0, (1 - countdown / 10) * 100)}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              {isDeleted
                ? 'Original documents have been securely and permanently purged from server memory and storage.'
                : '10-second server countdown in progress. All uploaded files are scheduled for automatic destruction.'}
            </p>
          </div>

          {/* Receipt Available CTA */}
          <button
            onClick={() => router.push(`/job/${jobId}/receipt`)}
            className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-sm transition-all text-sm"
          >
            <FileText className="w-5 h-5" />
            <span>View & Download Receipt</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

