'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { Printer, RefreshCw, CheckCircle2, AlertCircle, Loader2, Play, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function AdminPrintersPage() {
  const [testLoading, setTestLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; isError?: boolean } | null>(null);

  const { data: auth, isLoading: authLoading, isError: authError } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => apiRequest('/api/v1/auth/me'),
    retry: 1,
  });

  const shopId = auth?.shopId;

  const { data: printers = [], isLoading, refetch } = useQuery({
    queryKey: ['shop-printers', shopId],
    queryFn: () => apiRequest(`/api/v1/printers/shop/${shopId}`),
    enabled: !!shopId,
    refetchInterval: 5000,
  });

  const handleTestPrint = async (printerId: string) => {
    setTestLoading(printerId);
    setFeedback(null);
    try {
      const res = await apiRequest(`/api/v1/printers/${printerId}/test-print`, {
        method: 'POST',
      });
      setFeedback({ msg: res.data?.message || res.message || 'Test print accepted by Desktop Agent and spooled.' });
    } catch (err: any) {
      setFeedback({ msg: err.message || 'Failed to dispatch test print.', isError: true });
    } finally {
      setTestLoading(null);
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
            Please log in with your shop credentials to view and manage physical printers.
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Connected Printers</h1>
          <p className="text-sm text-slate-600 mt-1">
            Printers discovered dynamically via Windows Print Spooler (`System.Printing`)
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center space-x-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center space-x-2 ${
            feedback.isError
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {feedback.isError ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Printers List */}
      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Scanning spooler printers...</p>
        </div>
      ) : printers.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl text-center space-y-3 border border-slate-200 bg-white shadow-sm">
          <Printer className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Printers Discovered</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Pair your Windows computer under &quot;Desktop Agents&quot; to automatically register local and network printers.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {printers.map((p: any) => {
            const caps = p.capabilitiesJson || {};
            const isWorking = testLoading === p.id;

            return (
              <div
                key={p.id}
                className="glass-card p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                      <Printer className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                        <span>{p.windowsPrinterName}</span>
                        {p.isDefault && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{p.driverName || 'Generic / Text Only'}</div>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-800">
                    {p.status}
                  </span>
                </div>

                {/* Capabilities Badges */}
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                    {caps.supportsColor ? 'Color Supported' : 'Monochrome Only'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                    {caps.supportsDuplex ? 'Two-Sided Duplex' : 'Single-Sided'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                    Sizes: {caps.supportedPaperSizes?.join(', ') || 'A4'}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Host: <strong className="text-slate-700">{p.agent?.machineName || 'Windows Agent'}</strong>
                  </span>

                  {p.agent?.status === 'ONLINE' ? (
                    <button
                      onClick={() => handleTestPrint(p.id)}
                      disabled={isWorking}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm text-xs transition-colors"
                    >
                      {isWorking ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Spooling...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Test Print</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span
                      title="The host computer for this printer queue is currently offline."
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 text-[11px] font-medium cursor-not-allowed"
                    >
                      <AlertCircle className="w-3 h-3 text-slate-400" />
                      <span>Host PC Offline</span>
                    </span>
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
