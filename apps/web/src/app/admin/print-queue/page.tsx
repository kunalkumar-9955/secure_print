'use client';

import React, { useState } from 'react';
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
  LogIn,
} from 'lucide-react';
import Link from 'next/link';
import { formatCustomerFileName } from '@/lib/format-filename';

export default function AdminPrintQueuePage() {
  const [filter, setFilter] = useState<string>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);

  // Authenticated user to get shopId
  const { data: auth, isLoading: authLoading, isError: authError } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => apiRequest('/api/v1/auth/me'),
    retry: 1,
  });

  const shopId = auth?.shopId;

  // Poll print queue every 2.5 seconds
  const { data: queue = [], isLoading, refetch } = useQuery({
    queryKey: ['print-queue', shopId],
    queryFn: () => apiRequest(`/api/v1/jobs/shop/${shopId}`),
    enabled: !!shopId,
    refetchInterval: 2500,
  });

  // Poll agent status to verify real online connectivity
  const { data: agents = [] } = useQuery({
    queryKey: ['shop-agents-queue', shopId],
    queryFn: () => apiRequest(`/api/v1/agents/shop/${shopId}`),
    enabled: !!shopId,
    refetchInterval: 4000,
  });

  const onlineAgent = agents.find((a: any) => a.status === 'ONLINE');
  const isAgentOnline = !!onlineAgent;

  const handlePrint = async (jobId: string) => {
    setActionLoading(jobId);
    setPrintError(null);
    try {
      await apiRequest(`/api/v1/jobs/${jobId}/print`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await refetch();
    } catch (err: any) {
      setPrintError(err.message || 'Failed to dispatch print to agent.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompletePrint = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      await apiRequest(`/api/v1/jobs/${jobId}/complete-print`, {
        method: 'POST',
      });
      await refetch();
    } catch (err: any) {
      alert(`Error completing print: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmCash = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      await apiRequest('/api/v1/payments/confirm-cash', {
        method: 'POST',
        body: JSON.stringify({ jobId }),
      });
      await refetch();
    } catch (err: any) {
      alert(`Error confirming cash: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Verifying shop credentials...</p>
      </div>
    );
  }

  if (authError || !auth) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 shadow-xl rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Sign In Required</h2>
          <p className="text-sm text-slate-600">
            Please log in with your shop operator credentials to access the live print queue.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center space-x-2 w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
          >
            <span>Sign In</span>
          </Link>
        </div>
      </div>
    );
  }

  const filteredQueue = queue.filter((job: any) => {
    if (filter === 'ALL') return true;
    if (filter === 'PENDING') return job.status === 'REQUEST_SENT' || job.status === 'SHOP_RECEIVED';
    if (filter === 'PRINTING') return job.status === 'PRINTING';
    if (filter === 'PAYMENT') return job.status === 'AWAITING_PAYMENT' || job.status === 'PAYMENT_PENDING';
    if (filter === 'COMPLETED') return job.status === 'PAYMENT_SUCCESS' || job.status === 'FILES_DELETED';
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Print Queue</h1>
          <p className="text-sm text-slate-600 mt-1">Live operational jobs received from customer counter scans</p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center space-x-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Agent Status Banner */}
      {isAgentOnline ? (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm text-xs">
          <div className="flex items-center space-x-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              <strong>Desktop Print Agent Active:</strong> Connected on host <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-slate-800 font-mono font-bold">{onlineAgent.machineName}</code> (v{onlineAgent.agentVersion}). Physical prints will be spooled automatically.
            </span>
          </div>
          <span className="font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 text-[11px] shadow-sm whitespace-nowrap">
            READY TO DISPATCH
          </span>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm text-xs">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Desktop Agent Offline:</strong> The SecurePrint Windows Agent must be running and paired on your counter PC to dispatch physical prints.
            </span>
          </div>
          <Link
            href="/admin/agents"
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm whitespace-nowrap"
          >
            <span>Connect Desktop Agent →</span>
          </Link>
        </div>
      )}

      {/* Dispatch Error Notification */}
      {printError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>{printError}</span>
          </div>
          <button
            type="button"
            onClick={() => setPrintError(null)}
            className="text-red-500 hover:text-red-700 font-bold px-2 py-0.5 rounded"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 overflow-x-auto">
        {['ALL', 'PENDING', 'PRINTING', 'PAYMENT', 'COMPLETED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Queue List */}
      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Syncing live print jobs...</p>
        </div>
      ) : filteredQueue.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl text-center space-y-3 border border-slate-200 bg-white shadow-sm">
          <FileText className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="text-base font-bold text-slate-900">No print jobs in this category</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Customers scanning your permanent counter QR code will appear in this queue instantly.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQueue.map((job: any) => {
            const pricing = job.pricingSnapshotJson || {};
            const options = job.printOptionsJson || {};
            const file = job.files?.[0];
            const isCashPending = job.paymentMethod === 'CASH' && job.paymentStatus === 'PENDING';
            const isWorking = actionLoading === job.id;

            return (
              <div
                key={job.id}
                className="glass-card p-5 sm:p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all hover:border-slate-300"
              >
                {/* Left: Job Meta */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-base font-extrabold text-slate-900">#{job.jobCode}</span>
                    <span className="text-sm font-semibold text-emerald-700">{job.customerName}</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                        job.status === 'PRINTING'
                          ? 'bg-amber-50 border-amber-300 text-amber-800 animate-pulse'
                          : job.status === 'AWAITING_PAYMENT'
                          ? 'bg-purple-50 border-purple-300 text-purple-800'
                          : job.status === 'PAYMENT_SUCCESS' || job.status === 'FILES_DELETED'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-blue-50 border-blue-300 text-blue-800'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                    <span>
                      Doc: <strong className="text-slate-900">{formatCustomerFileName(file?.originalName, file?.mimeType)}</strong>
                    </span>
                    <span>•</span>
                    <span>Mode: <strong className="text-slate-900">{options.colorMode === 'COLOR' ? 'Color' : 'B&W'}</strong></span>
                    <span>•</span>
                    <span>Copies: <strong className="text-slate-900">{options.copies || 1}</strong></span>
                    <span>•</span>
                    <span>Sides: <strong className="text-slate-900">{options.duplex !== 'NONE' ? '2-Sided' : '1-Sided'}</strong></span>
                    <span>•</span>
                    <span>Amount: <strong className="text-emerald-700 font-bold">₹{Number(pricing.finalAmount || 2).toFixed(2)}</strong></span>
                  </div>

                  {file?.isDeleted && (
                    <div className="text-[11px] text-emerald-700 font-medium flex items-center space-x-1">
                      <span>✓ Privacy Shredded: Document permanently deleted from disk.</span>
                    </div>
                  )}
                </div>

                {/* Right: Operational Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  {!file?.isDeleted && (
                    <a
                      href={`/api/v1/jobs/${job.id}/file/${file?.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                    >
                      <span>Preview</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {/* Print Action */}
                  {(job.status === 'REQUEST_SENT' || job.status === 'SHOP_RECEIVED') && (
                    <button
                      onClick={() => {
                        if (!isAgentOnline) {
                          setPrintError(
                            'Desktop Agent is offline on your counter PC. Please launch SecurePrint Agent on Windows, or click "Connect Desktop Agent" above.',
                          );
                          return;
                        }
                        handlePrint(job.id);
                      }}
                      disabled={isWorking}
                      className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        !isAgentOnline
                          ? 'bg-amber-100 border border-amber-300 text-amber-900 hover:bg-amber-200 shadow-sm'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20'
                      }`}
                      title={!isAgentOnline ? 'Desktop Agent is offline. Click to view instructions.' : 'Dispatch job to Windows physical printer'}
                    >
                      {isWorking ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Printer className="w-3.5 h-3.5" />
                      )}
                      <span>{isAgentOnline ? 'Print via Agent' : 'Agent Offline'}</span>
                    </button>
                  )}

                  {/* Complete Print Action */}
                  {job.status === 'PRINTING' && (
                    <button
                      onClick={() => handleCompletePrint(job.id)}
                      disabled={isWorking}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
                    >
                      {isWorking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>Mark Printing Done</span>
                    </button>
                  )}

                  {/* Confirm Counter Cash Action */}
                  {isCashPending && (
                    <button
                      onClick={() => handleConfirmCash(job.id)}
                      disabled={isWorking}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/20 animate-pulse"
                    >
                      {isWorking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Banknote className="w-3.5 h-3.5" />}
                      <span>Confirm Cash Received (₹{Number(pricing.finalAmount || 2).toFixed(2)})</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
