'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import {
  FileText,
  Printer,
  Clock,
  CheckCircle2,
  Banknote,
  Monitor,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  QrCode,
  LogIn,
  RefreshCw,
} from 'lucide-react';

export default function AdminDashboardPage() {
  // First fetch authenticated user to get current shopId
  const { data: auth, isLoading: authLoading, isError: authError } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => apiRequest('/api/v1/auth/me'),
    retry: 1,
  });

  const shopId = auth?.shopId;

  // Then fetch real operational summary
  const {
    data: summary,
    isLoading: summaryLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['shop-summary', shopId],
    queryFn: () => apiRequest(`/api/v1/analytics/shop/${shopId}`),
    enabled: !!shopId,
    refetchInterval: 5000,
  });

  if (authLoading || (shopId && summaryLoading)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading operational metrics...</p>
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
            Please log in with your shop owner credentials to access the operational console.
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

  if (error) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-4">
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center space-x-3 max-w-md">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>Failed to load operational dashboard: {(error as any).message}</div>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const cards = [
    {
      label: "Today's Print Jobs",
      value: summary?.todayJobs ?? 0,
      sub: 'Received today (IST)',
      icon: FileText,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200',
      href: '/admin/print-queue',
    },
    {
      label: 'Active Printing',
      value: summary?.printingJobs ?? 0,
      sub: 'Currently spooling',
      icon: Printer,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200',
      href: '/admin/print-queue',
    },
    {
      label: 'Waiting for Payment',
      value: summary?.waitingPaymentJobs ?? 0,
      sub: 'Printed, payment pending',
      icon: Clock,
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-200',
      href: '/admin/print-queue',
    },
    {
      label: 'Completed & Deleted',
      value: summary?.completedJobs ?? 0,
      sub: 'Files securely shredded',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200',
      href: '/admin/print-queue',
    },
    {
      label: "Today's Revenue",
      value: `₹${Number(summary?.todayRevenue || 0).toFixed(2)}`,
      sub: 'Asia/Kolkata date filter',
      icon: Banknote,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200',
      href: '/admin/print-queue',
    },
    {
      label: 'Online Agents',
      value: summary?.onlineAgents ?? 0,
      sub: 'Windows PCs paired',
      icon: Monitor,
      color: 'text-sky-600',
      bg: 'bg-sky-50 border-sky-200',
      href: '/admin/agents',
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Operational Dashboard
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Real-time counter overview for {auth?.shop?.name || 'Your Shop'} • Timezone: Asia/Kolkata
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/admin/print-queue"
            className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition-all text-xs"
          >
            <span>Open Print Queue</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
          <Link
            href="/admin/qr"
            className="inline-flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl border border-slate-300 transition-all text-xs shadow-sm"
          >
            <QrCode className="w-4 h-4" />
            <span>Counter QR</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              href={card.href}
              className="glass-card glass-card-hover p-6 rounded-2xl border border-slate-200 bg-white space-y-4 block"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase font-bold tracking-wider text-slate-500">
                  {card.label}
                </div>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${card.bg} ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{card.value}</div>
                <div className="text-xs text-slate-500 mt-1">{card.sub}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Status Bar */}
      <div className="glass-card p-6 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">Windows Spooler Dispatcher Active</div>
            <div className="text-xs text-slate-600 mt-0.5">
              {summary?.readyPrinters ?? 0} ready printers discovered on {summary?.onlineAgents ?? 0} online Windows computers.
            </div>
          </div>
        </div>

        <Link
          href="/admin/agents"
          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 border border-emerald-200 px-4 py-2 rounded-xl bg-emerald-50"
        >
          Manage Computers & Printers
        </Link>
      </div>
    </div>
  );
}
