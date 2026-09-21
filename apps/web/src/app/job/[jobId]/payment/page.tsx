'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { formatCustomerFileName } from '@/lib/format-filename';
import { CreditCard, Banknote, ShieldCheck, AlertCircle, Loader2, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function JobPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = params?.jobId as string;
  const returnedOrderId = searchParams.get('order_id');

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cashRequested, setCashRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll job status to detect shopkeeper cash confirmation or completion
  const { data: job, isLoading, isError, error: queryError, refetch } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => apiRequest(`/api/v1/jobs/${jobId}`),
    enabled: !!jobId && jobId !== 'new',
    refetchInterval: 3000,
  });

  // If order_id returned in query string, trigger server-side verification
  useEffect(() => {
    if (returnedOrderId && !verifying) {
      handleServerVerify(returnedOrderId);
    }
  }, [returnedOrderId]);

  // If job is already PAYMENT_SUCCESS or FILES_DELETED, forward to success page
  useEffect(() => {
    if (
      job?.status === 'PAYMENT_SUCCESS' ||
      job?.status === 'CLEANUP_PENDING' ||
      job?.status === 'FILES_DELETED'
    ) {
      router.push(`/job/${jobId}/success`);
    }
  }, [job, jobId, router]);

  const handleServerVerify = async (orderId: string) => {
    setVerifying(true);
    setError(null);
    try {
      const res = await apiRequest('/api/v1/payments/verify', {
        method: 'POST',
        body: JSON.stringify({ jobId, providerOrderId: orderId }),
      });

      if (res.verified) {
        router.push(`/job/${jobId}/success`);
      } else {
        setError(res.message || 'Payment is still being processed by the gateway.');
      }
    } catch (err: any) {
      setError(err.message || 'Payment verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  const handlePayOnline = async () => {
    setLoading(true);
    setError(null);
    try {
      const order = await apiRequest('/api/v1/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({ jobId }),
      });

      if (order?.paymentUrl) {
        window.location.href = order.paymentUrl;
      } else {
        setError('Payment gateway did not provide a checkout session. Please try again or pay cash at the counter.');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to start payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayCash = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiRequest('/api/v1/payments/request-cash', {
        method: 'POST',
        body: JSON.stringify({ jobId }),
      });
      setCashRequested(true);
    } catch (err: any) {
      setError(err.message || 'Could not request counter cash payment.');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <span className="text-xs text-slate-500 font-medium mt-3">Loading order details...</span>
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
            {(queryError as any)?.message || 'We could not retrieve the payment invoice for this job.'}
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

  // NON-NEGOTIABLE RULE: No payment before printing completed
  if (!job.printingCompleted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl text-center space-y-4 border border-amber-200 shadow-sm">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Printing in Progress</h2>
          <p className="text-sm text-slate-600">
            Payment cannot be processed before your document is physically printed. Please wait for the counter operator to complete printing.
          </p>
          <button
            onClick={() => router.push(`/job/${jobId}/status`)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-sm transition-colors"
          >
            Return to Job Tracking
          </button>
        </div>
      </div>
    );
  }

  const finalAmount = Number(job.pricingSnapshotJson?.finalAmount || 2).toFixed(2);
  const friendlyDocName = formatCustomerFileName(job.files?.[0]?.originalName, job.files?.[0]?.mimeType);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Complete Payment</h1>
          <p className="text-sm text-slate-500">Your prints are ready at the counter.</p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm space-y-2">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
                <div className="font-medium text-xs sm:text-sm">{error}</div>
              </div>
              <div className="flex items-center space-x-2 pt-1 pl-7">
                <button
                  type="button"
                  onClick={handlePayOnline}
                  disabled={loading}
                  className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-xs text-red-600 hover:underline font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {verifying && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center space-x-3">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              <span>Verifying Payment with Gateway...</span>
            </div>
          )}

          {/* Amount Due Display */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Payable Amount</div>
            <div className="text-4xl font-extrabold text-slate-900 tracking-tight">₹{finalAmount}</div>
            <div className="text-xs text-emerald-700 font-semibold pt-1 truncate max-w-xs mx-auto">
              Order #{job.jobCode} • {friendlyDocName}
            </div>
          </div>

          {/* Payment Method Actions */}
          {!cashRequested ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handlePayOnline}
                disabled={loading || verifying}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 text-left transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Pay Online</div>
                    <div className="text-xs text-slate-500">UPI, Google Pay, PhonePe, Cards</div>
                  </div>
                </div>
                <div className="text-xs font-bold text-emerald-700 uppercase">Instant</div>
              </button>

              <button
                type="button"
                onClick={handlePayCash}
                disabled={loading || verifying}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center shadow-sm">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Pay Cash at Counter</div>
                    <div className="text-xs text-slate-500">Hand physical cash to shopkeeper</div>
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-500">Counter</div>
              </button>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-3">
              <Banknote className="w-10 h-10 text-amber-600 mx-auto" />
              <div className="text-base font-bold text-amber-900">Cash Payment Requested</div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Please hand <strong className="text-slate-900 font-bold">₹{finalAmount}</strong> to the counter operator.
                This screen will automatically confirm as soon as the operator clicks confirm.
              </p>
              <div className="inline-flex items-center space-x-2 text-xs text-amber-700 pt-2 font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                <span>Waiting for counter confirmation...</span>
              </div>
            </div>
          )}

          {/* Privacy Note */}
          <div className="text-[11px] text-slate-500 text-center flex items-center justify-center space-x-1 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Files are permanently destroyed 10s after payment verification</span>
          </div>
        </div>
      </div>
    </div>
  );
}
