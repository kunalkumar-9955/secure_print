'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import {
  Store,
  CreditCard,
  Layers,
  CheckCircle2,
  Trash2,
  Monitor,
  Printer,
  TrendingUp,
  Loader2,
  AlertCircle,
  Clock,
  ShieldAlert,
  LogIn,
  RefreshCw,
} from 'lucide-react';

export default function SuperAdminOverviewPage() {
  const { data: metrics, isLoading, error, refetch } = useQuery({
    queryKey: ['platform-metrics'],
    queryFn: () => apiRequest('/api/v1/analytics/platform'),
    refetchInterval: 5000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading platform metrics...</p>
      </div>
    );
  }

  if (error) {
    const errorMsg = (error as any)?.message || 'Failed to load platform metrics.';
    const status = (error as any)?.status;
    const isAuthError =
      status === 401 ||
      status === 403 ||
      errorMsg.includes('Authentication') ||
      errorMsg.includes('401') ||
      errorMsg.includes('Access denied') ||
      errorMsg.includes('403') ||
      errorMsg.includes('Insufficient role permissions') ||
      errorMsg.includes('Forbidden');

    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center space-y-4">
        {isAuthError ? (
          <div className="max-w-md w-full bg-white border border-slate-200 shadow-xl rounded-2xl p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Super Admin Access Required</h2>
            <p className="text-sm text-slate-600">
              You must be signed in with a Super Admin account to access multi-tenant platform metrics.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center space-x-2 w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In as Super Admin</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="max-w-md w-full bg-white border border-slate-200 shadow-xl rounded-2xl p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Metrics Unavailable</h2>
            <p className="text-sm text-slate-600">{errorMsg}</p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Platform Overview
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          High-level metrics across all onboarded print shops, subscriptions, and physical agents
        </p>
      </div>

      {/* Financial Domain Separation Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-purple-200 bg-purple-50/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-purple-700 tracking-wider">SaaS Platform Revenue</span>
            <CreditCard className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            ₹{Number(metrics?.revenue?.saasSubscriptionRevenue || 0).toFixed(2)}
          </div>
          <p className="text-xs text-slate-600">
            Subscription fees paid by cyber cafes and print shops directly to SecurePrint.
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-emerald-700 tracking-wider">Customer Print GMV</span>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            ₹{Number(metrics?.revenue?.customerPrintGmv || 0).toFixed(2)}
          </div>
          <p className="text-xs text-slate-600">
            Gross merchandise value processed by shops from customer counter printing.
          </p>
        </div>
      </div>

      {/* Tenant Metrics Grid */}
      <div className="space-y-3">
        <h2 className="text-xs uppercase font-bold text-slate-500 tracking-wider">Tenant Breakdown</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
            <div className="text-xs text-slate-500 font-medium">Total Shops</div>
            <div className="text-2xl font-extrabold text-slate-900">{metrics?.shops?.total ?? 0}</div>
          </div>
          <div className="glass-card p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-1">
            <div className="text-xs text-emerald-700 font-semibold">Active Subscriptions</div>
            <div className="text-2xl font-extrabold text-slate-900">{metrics?.shops?.active ?? 0}</div>
          </div>
          <div className="glass-card p-5 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-1">
            <div className="text-xs text-amber-700 font-semibold">Pending Payment</div>
            <div className="text-2xl font-extrabold text-slate-900">{metrics?.shops?.pending ?? 0}</div>
          </div>
          <div className="glass-card p-5 rounded-2xl border border-red-200 bg-red-50/40 space-y-1">
            <div className="text-xs text-red-700 font-semibold">Suspended</div>
            <div className="text-2xl font-extrabold text-slate-900">{metrics?.shops?.suspended ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Operational Volume Grid */}
      <div className="space-y-3">
        <h2 className="text-xs uppercase font-bold text-slate-500 tracking-wider">Physical Hardware & Privacy</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
            <div className="text-xs text-slate-500 font-medium">Total Jobs Dispatched</div>
            <div className="text-2xl font-extrabold text-slate-900">{metrics?.operations?.totalJobs ?? 0}</div>
          </div>
          <div className="glass-card p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
            <div className="text-xs text-emerald-700 font-semibold">Files Shredded (10s delay)</div>
            <div className="text-2xl font-extrabold text-slate-900">{metrics?.operations?.filesDeleted ?? 0}</div>
          </div>
          <div className="glass-card p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
            <div className="text-xs text-sky-700 font-semibold">Online Windows PCs</div>
            <div className="text-2xl font-extrabold text-slate-900">{metrics?.operations?.onlineAgents ?? 0}</div>
          </div>
          <div className="glass-card p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
            <div className="text-xs text-purple-700 font-semibold">Discovered Spooler Queues</div>
            <div className="text-2xl font-extrabold text-slate-900">{metrics?.operations?.readyPrinters ?? 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
