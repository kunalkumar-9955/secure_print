'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import {
  Printer,
  CheckCircle2,
  Banknote,
  FileText,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  ArrowLeft,
  CreditCard,
  Trash2,
  CheckCircle,
  Monitor,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.jobId as string;
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: job,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-job-detail', jobId],
    queryFn: () => apiRequest(`/api/v1/jobs/${jobId}`),
    enabled: !!jobId,
    refetchInterval: 3000,
  });

  const handlePrint = async () => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await apiRequest(`/api/v1/jobs/${jobId}/print`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await refetch();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to trigger print job.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompletePrint = async () => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await apiRequest(`/api/v1/jobs/${jobId}/complete-print`, {
        method: 'POST',
      });
      await refetch();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to mark print as completed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCash = async () => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await apiRequest('/api/v1/payments/confirm-cash', {
        method: 'POST',
        body: JSON.stringify({ jobId }),
      });
      await refetch();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to confirm cash payment.');
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading job details...</p>
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <button
          onClick={() => router.push('/admin/print-queue')}
          className="inline-flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Print Queue</span>
        </button>
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-3">
          <div className="flex items-center space-x-2 font-bold">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span>Failed to load print job</span>
          </div>
          <p className="text-sm text-rose-700">
            {(error as any)?.message || 'Job was not found or you do not have permission to view it.'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const options = job.printOptionsJson || {};
  const pricing = job.pricingSnapshotJson || {};
  const file = job.files?.[0];
  const receipt = job.receipts?.[0];
  const isPaid = job.paymentStatus === 'SUCCESS';
  const isCashRequested = job.paymentMethod === 'CASH' && job.status === 'AWAITING_PAYMENT';

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top bar navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/admin/print-queue')}
          className="inline-flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Print Queue</span>
        </button>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-black text-slate-900 font-mono">#{job.jobCode}</h1>
              <span
                className={`px-3 py-1 text-xs font-bold rounded-full ${
                  job.status === 'PAYMENT_SUCCESS' || job.status === 'FILES_DELETED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : job.status === 'PRINTING'
                    ? 'bg-blue-100 text-blue-800'
                    : job.status === 'AWAITING_PAYMENT'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                {job.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Customer: <span className="font-semibold text-slate-800">{job.session?.customerName || 'Walk-in'}</span> • Submitted {new Date(job.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {!job.printingCompleted && job.status !== 'FILES_DELETED' && (
              <>
                <button
                  onClick={handlePrint}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  <Printer className="w-4 h-4" />
                  <span>Send to Printer</span>
                </button>
                <button
                  onClick={handleCompletePrint}
                  disabled={actionLoading}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Mark Printed</span>
                </button>
              </>
            )}

            {isCashRequested && (
              <button
                onClick={handleConfirmCash}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                <Banknote className="w-4 h-4" />
                <span>Confirm Cash (₹{pricing.finalAmount || 0})</span>
              </button>
            )}

            {receipt && (
              <Link
                href={`/job/${jobId}/receipt`}
                target="_blank"
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-sm font-semibold transition-all flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>View Receipt</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Document, Options, Pricing, Payment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Document Details */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-bold border-b border-slate-100 pb-3">
            <FileText className="w-5 h-5 text-emerald-600" />
            <span>Document & Privacy</span>
          </div>

          {file ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">File Name:</span>
                <span className="font-semibold text-slate-800 break-all max-w-[220px]">{file.originalName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Format:</span>
                <span className="font-mono text-slate-700">{file.mimeType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Page Count:</span>
                <span className="font-bold text-slate-900">{file.pageCount} page(s)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Storage State:</span>
                {file.isDeleted ? (
                  <span className="inline-flex items-center space-x-1 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                    <Trash2 className="w-3 h-3" />
                    <span>Deleted (Privacy Enforced)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Retained in Private Storage</span>
                  </span>
                )}
              </div>
              {!file.isDeleted && (
                <div className="pt-2">
                  <a
                    href={`/api/v1/jobs/${job.id}/file/${file.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 text-xs text-emerald-700 font-bold hover:underline"
                  >
                    <span>View / Manual Browser Print</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No document attached.</p>
          )}
        </div>

        {/* Print Configuration */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-bold border-b border-slate-100 pb-3">
            <Printer className="w-5 h-5 text-blue-600" />
            <span>Print Specifications</span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Color Mode:</span>
              <span className="font-semibold text-slate-800">{options.color ? 'Full Color' : 'Black & White'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Copies:</span>
              <span className="font-bold text-slate-900">{options.copies || 1}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Paper Size:</span>
              <span className="font-semibold text-slate-800">{options.paperSize || 'A4'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Duplex (Two-Sided):</span>
              <span className="font-semibold text-slate-800">{options.duplex ? 'Yes (Double Sided)' : 'No (Single Sided)'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Physical Print Completed:</span>
              <span className={`font-bold ${job.printingCompleted ? 'text-emerald-600' : 'text-amber-600'}`}>
                {job.printingCompleted ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Calculation Snapshot */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-bold border-b border-slate-100 pb-3">
            <Banknote className="w-5 h-5 text-emerald-600" />
            <span>Server Pricing Snapshot</span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Total Printable Sheets:</span>
              <span className="font-semibold text-slate-800">{pricing.totalPages || file?.pageCount || 1}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Rate per Page:</span>
              <span className="font-semibold text-slate-800">₹{pricing.ratePerPage || 2}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Currency:</span>
              <span className="font-mono text-slate-700">{pricing.currency || 'INR'}</span>
            </div>
            <div className="flex justify-between py-2 border-t border-slate-200 text-base font-bold text-slate-900">
              <span>Final Calculated Amount:</span>
              <span className="text-emerald-700 font-mono">₹{pricing.finalAmount || 0}</span>
            </div>
          </div>
        </div>

        {/* Payment & Settlement Info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-bold border-b border-slate-100 pb-3">
            <CreditCard className="w-5 h-5 text-purple-600" />
            <span>Payment & Settlement</span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Payment Method:</span>
              <span className="font-semibold text-slate-800">{job.paymentMethod || 'NOT SELECTED'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Payment Status:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-xs ${
                  isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {job.paymentStatus}
              </span>
            </div>
            {receipt && (
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Receipt Number:</span>
                <span className="font-mono font-bold text-slate-900">{receipt.receiptNumber}</span>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Last Updated:</span>
              <span className="text-slate-700 text-xs">
                {new Date(job.updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Print Attempts Timeline */}
      {job.printAttempts && job.printAttempts.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-bold border-b border-slate-100 pb-3">
            <Monitor className="w-5 h-5 text-slate-700" />
            <span>Desktop Agent Print Attempts</span>
          </div>

          <div className="divide-y divide-slate-100">
            {job.printAttempts.map((attempt: any) => (
              <div key={attempt.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-semibold text-slate-800">
                    Attempt #{attempt.id.slice(0, 8)}
                  </div>
                  <div className="text-xs text-slate-500">
                    Started: {new Date(attempt.createdAt).toLocaleTimeString('en-IN')}
                    {attempt.errorMessage && <span className="text-rose-600 ml-2">Error: {attempt.errorMessage}</span>}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold ${
                    attempt.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : attempt.status === 'FAILED'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {attempt.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
