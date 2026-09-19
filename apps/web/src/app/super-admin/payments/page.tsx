'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import {
  CreditCard,
  Banknote,
  Calendar,
  Store,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import Link from 'next/link';

export default function SuperAdminPaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'CASHFREE' | 'CASH'>('ALL');

  const {
    data: payments = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['super-admin-payments'],
    queryFn: () => apiRequest('/api/v1/payments/platform'),
  });

  const filtered = payments.filter((p: any) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (p.shop?.name || '').toLowerCase().includes(term) ||
      (p.job?.jobCode || '').toLowerCase().includes(term) ||
      (p.job?.session?.customerName || '').toLowerCase().includes(term);

    if (!matchesSearch) return false;
    if (filter === 'ALL') return true;
    return p.provider === filter;
  });

  const totalGMV = payments
    .filter((p: any) => p.status === 'SUCCESS')
    .reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Platform Payments & GMV
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Global ledger of customer print settlements across all enrolled print shops.
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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Platform GMV
          </span>
          <div className="text-2xl font-black text-purple-700 font-mono">₹{totalGMV.toFixed(2)}</div>
          <div className="text-xs text-slate-400">Total processed print transactions</div>
        </div>
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Payments Recorded
          </span>
          <div className="text-2xl font-black text-slate-900 font-mono">{payments.length}</div>
          <div className="text-xs text-slate-400">All payment orders & counter records</div>
        </div>
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Successful Settlements
          </span>
          <div className="text-2xl font-black text-emerald-700 font-mono">
            {payments.filter((p: any) => p.status === 'SUCCESS').length}
          </div>
          <div className="text-xs text-slate-400">Completed without dispute</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by shop, job code, or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          {(['ALL', 'CASHFREE', 'CASH'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === f
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f === 'ALL' ? 'All' : f === 'CASHFREE' ? 'Online' : 'Cash'}
            </button>
          ))}
        </div>
      </div>

      {/* Content States */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading platform payments...</p>
        </div>
      ) : isError ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-3">
          <div className="flex items-center space-x-2 font-bold">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span>Failed to load payments</span>
          </div>
          <p className="text-sm text-rose-700">
            {(error as any)?.message || 'An error occurred while fetching payments.'}
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
          <h3 className="text-base font-bold text-slate-800">No payment records found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            When customer print transactions are executed, settlements across all shops will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Print Shop</th>
                  <th className="py-3.5 px-4">Job Code</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Method</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      {p.shop ? (
                        <Link
                          href={`/super-admin/shops/${p.shop.id}`}
                          className="font-bold text-slate-900 hover:underline inline-flex items-center space-x-1"
                        >
                          <Store className="w-3.5 h-3.5 text-purple-600" />
                          <span>{p.shop.name}</span>
                        </Link>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">{p.shopId}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      #{p.job?.jobCode || p.jobId?.slice(0, 8)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {p.job?.session?.customerName || 'Walk-in'}
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-900 font-mono">
                      ₹{Number(p.amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-bold ${
                          p.provider === 'CASHFREE'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {p.provider === 'CASHFREE' ? (
                          <>
                            <CreditCard className="w-3 h-3" />
                            <span>Online</span>
                          </>
                        ) : (
                          <>
                            <Banknote className="w-3 h-3" />
                            <span>Cash</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          p.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      <span className="inline-flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {new Date(p.createdAt).toLocaleDateString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                          })}
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
