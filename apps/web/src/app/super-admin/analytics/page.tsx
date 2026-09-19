'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import {
  BarChart3,
  TrendingUp,
  Store,
  CreditCard,
  Printer,
  FileText,
  ShieldCheck,
  AlertCircle,
  Loader2,
  RefreshCw,
  Monitor,
  DollarSign,
} from 'lucide-react';

export default function SuperAdminAnalyticsPage() {
  const {
    data: metrics,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['super-admin-analytics-page'],
    queryFn: () => apiRequest('/api/v1/analytics/platform'),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading platform analytics...</p>
      </div>
    );
  }

  if (isError || !metrics) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-3">
          <div className="flex items-center space-x-2 font-bold">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span>Failed to load platform analytics</span>
          </div>
          <p className="text-sm text-rose-700">
            {(error as any)?.message || 'An error occurred while fetching platform analytics.'}
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

  const { shops, revenue, subscriptions, system } = metrics;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Platform Analytics & Growth
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time financial performance, print volume, and multi-tenant shop distribution.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center space-x-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Customer Print GMV
            </span>
            <DollarSign className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 font-mono">
            ₹{Number(revenue?.customerPrintGmv || 0).toFixed(2)}
          </div>
          <div className="text-xs text-slate-400">Total customer print volume</div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              SaaS Subscription Revenue
            </span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">
            ₹{Number(revenue?.saasSubscriptionRevenue || 0).toFixed(2)}
          </div>
          <div className="text-xs text-slate-400">Shop software licenses</div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Print Shops
            </span>
            <Store className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{shops?.active || 0}</div>
          <div className="text-xs text-slate-400">Of {shops?.total || 0} total enrolled shops</div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Print Jobs
            </span>
            <FileText className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{system?.totalJobs || 0}</div>
          <div className="text-xs text-slate-400">Processed through platform</div>
        </div>
      </div>

      {/* Secondary Detailed Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shop Network Distribution */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2 font-bold text-slate-900">
              <Store className="w-5 h-5 text-purple-600" />
              <span>Shop Network Breakdown</span>
            </div>
            <span className="text-xs font-semibold text-slate-400">Tenants</span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-600">Active Operational Shops:</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full text-xs">
                {shops?.active || 0}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-600">Pending Subscription Onboarding:</span>
              <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full text-xs">
                {shops?.pending || 0}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-600">Suspended / Inactive Shops:</span>
              <span className="font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full text-xs">
                {shops?.suspended || 0}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 pt-3 font-bold text-slate-900">
              <span>Total Network Footprint:</span>
              <span className="font-mono">{shops?.total || 0} shops</span>
            </div>
          </div>
        </div>

        {/* Infrastructure & Privacy Fleet */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2 font-bold text-slate-900">
              <Monitor className="w-5 h-5 text-blue-600" />
              <span>Hardware & Privacy Metrics</span>
            </div>
            <span className="text-xs font-semibold text-slate-400">Live Hardware</span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-600">Online Counter Computers:</span>
              <span className="font-bold text-emerald-700 font-mono">
                {system?.onlineAgents || 0} PCs
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-600">Spooler Ready Printers:</span>
              <span className="font-bold text-blue-700 font-mono">
                {system?.readyPrinters || 0} units
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-600">Purged Privacy Documents:</span>
              <span className="font-bold text-purple-700 font-mono">
                {system?.deletedFiles || 0} files
              </span>
            </div>
            <div className="flex justify-between items-center py-2 pt-3 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>100% compliance with 10-second post-payment privacy purge.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
