'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import {
  Users,
  Store,
  Smartphone,
  Calendar,
  FileText,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import Link from 'next/link';

export default function SuperAdminCustomerSessionsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: sessions = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['super-admin-customer-sessions'],
    queryFn: () => apiRequest('/api/v1/customers/platform'),
  });

  const filtered = sessions.filter((s: any) => {
    const term = searchTerm.toLowerCase();
    return (
      s.customerName.toLowerCase().includes(term) ||
      (s.shop?.name || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Customer Sessions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Global view of all active and recent customer upload sessions across enrolled print shops.
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
          placeholder="Search by customer name or shop..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
        />
      </div>

      {/* Content States */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading customer sessions...</p>
        </div>
      ) : isError ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-3">
          <div className="flex items-center space-x-2 font-bold">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span>Failed to load customer sessions</span>
          </div>
          <p className="text-sm text-rose-700">
            {(error as any)?.message || 'An error occurred while fetching customer sessions.'}
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
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No customer sessions found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            When customers scan QR codes at shops, their sessions will be monitored here.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Customer Name</th>
                  <th className="py-3.5 px-4">Print Shop</th>
                  <th className="py-3.5 px-4">Device Info</th>
                  <th className="py-3.5 px-4">Jobs Submitted</th>
                  <th className="py-3.5 px-4">Started At</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((s: any) => {
                  const isExpired = new Date(s.expiresAt) < new Date();
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center space-x-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>{s.customerName}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        {s.shop ? (
                          <Link
                            href={`/super-admin/shops/${s.shop.id}`}
                            className="font-semibold text-purple-700 hover:underline inline-flex items-center space-x-1"
                          >
                            <Store className="w-3.5 h-3.5" />
                            <span>{s.shop.name}</span>
                          </Link>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">{s.shopId}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">
                        <span className="inline-flex items-center space-x-1">
                          <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[180px]">{s.deviceInfo || 'Browser'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <span className="inline-flex items-center space-x-1">
                          <FileText className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{s._count?.printJobs || 0} job(s)</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        <span className="inline-flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {new Date(s.createdAt).toLocaleString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                            })}
                          </span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isExpired
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isExpired ? 'EXPIRED' : 'ACTIVE'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
