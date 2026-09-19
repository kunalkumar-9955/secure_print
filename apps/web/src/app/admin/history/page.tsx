'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import {
  History,
  FileText,
  Trash2,
  Calendar,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Search,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminHistoryPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: auth } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => apiRequest('/api/v1/auth/me'),
  });

  const shopId = auth?.shopId;

  const {
    data: history = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-shop-history', shopId],
    queryFn: () => apiRequest(`/api/v1/jobs/shop/${shopId}/history`),
    enabled: !!shopId,
  });

  const filtered = history.filter((j: any) => {
    const term = searchTerm.toLowerCase();
    return (
      j.jobCode.toLowerCase().includes(term) ||
      (j.customerName || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Print Job History & Archive
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Historical print logs with retained metadata and receipts. Source documents are permanently deleted after payment per privacy compliance.
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

      {/* Privacy Notice Banner */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start space-x-3 text-sm text-emerald-900">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Zero-Storage Privacy Architecture: </span>
          <span>
            SecurePrint automatically purges private uploaded documents 10 seconds after verified payment. Financial records, page counts, and customer receipts are permanently preserved for audit.
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Search by job code or customer name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
      </div>

      {/* Content States */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading print history...</p>
        </div>
      ) : isError ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-3">
          <div className="flex items-center space-x-2 font-bold">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span>Failed to load print history</span>
          </div>
          <p className="text-sm text-rose-700">
            {(error as any)?.message || 'An error occurred while fetching history.'}
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
          <History className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No archived print jobs</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Jobs that have been printed, settled, and cleaned up will be cataloged here.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Job Code</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Document Details</th>
                  <th className="py-3.5 px-4">Storage Privacy</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((j: any) => {
                  const file = j.files?.[0];
                  const receipt = j.receipts?.[0];
                  const isDeleted = file?.isDeleted || j.status === 'FILES_DELETED';

                  return (
                    <tr key={j.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <Link
                          href={`/admin/print-queue/${j.id}`}
                          className="text-emerald-700 hover:underline"
                        >
                          #{j.jobCode}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {j.customerName || 'Walk-in'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {file ? (
                          <div>
                            <span className="font-semibold text-slate-800 block truncate max-w-[180px]">
                              {file.originalName}
                            </span>
                            <span className="text-slate-400 font-mono">{file.pageCount} page(s)</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">No file</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isDeleted ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700">
                            <Trash2 className="w-3 h-3" />
                            <span>Document Deleted</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Retained</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            j.status === 'FILES_DELETED' || j.status === 'PAYMENT_SUCCESS'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {j.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        <span className="inline-flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {new Date(j.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                          </span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {receipt ? (
                          <Link
                            href={`/job/${j.id}/receipt`}
                            target="_blank"
                            className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 hover:underline"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Receipt</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
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
