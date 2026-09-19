'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import {
  CreditCard,
  Store,
  Calendar,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

export default function SuperAdminSubscriptionsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: subscriptions = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['super-admin-subscriptions'],
    queryFn: () => apiRequest('/api/v1/subscriptions/platform'),
  });

  const filtered = subscriptions.filter((s: any) => {
    const term = searchTerm.toLowerCase();
    return (
      (s.shop?.name || '').toLowerCase().includes(term) ||
      (s.plan?.name || '').toLowerCase().includes(term) ||
      (s.plan?.tier || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Platform Subscriptions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Overview of SaaS subscription tiers, active billing periods, and shop subscription health.
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

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Search by shop name, plan, or tier..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
        />
      </div>

      {/* Content States */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading subscriptions...</p>
        </div>
      ) : isError ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-3">
          <div className="flex items-center space-x-2 font-bold">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span>Failed to load subscriptions</span>
          </div>
          <p className="text-sm text-rose-700">
            {(error as any)?.message || 'An error occurred while fetching subscriptions.'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-8 space-y-3">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No subscriptions found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            When print shops activate a SaaS subscription plan, their active periods will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Print Shop</th>
                  <th className="py-3.5 px-4">Plan & Tier</th>
                  <th className="py-3.5 px-4">Billing Cycle</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Current Period</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      {s.shop ? (
                        <Link
                          href={`/super-admin/shops/${s.shop.id}`}
                          className="font-bold text-slate-900 hover:underline inline-flex items-center space-x-1.5"
                        >
                          <Store className="w-4 h-4 text-purple-600" />
                          <span>{s.shop.name}</span>
                        </Link>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">{s.shopId}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{s.plan?.name || 'Pro Plan'}</div>
                      <span className="text-xs text-purple-700 font-bold uppercase tracking-wider">
                        {s.plan?.tier || 'PRO'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      {s.plan?.interval || 'MONTHLY'} (₹{Number(s.plan?.price || 499).toFixed(2)})
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          s.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>{s.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      <span className="inline-flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {new Date(s.currentPeriodStart).toLocaleDateString()} –{' '}
                          {new Date(s.currentPeriodEnd).toLocaleDateString()}
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
