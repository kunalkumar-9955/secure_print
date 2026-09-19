'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { ScrollText, ShieldCheck, Search, Loader2 } from 'lucide-react';

export default function SuperAdminAuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['platform-audit-logs'],
    queryFn: () => apiRequest('/api/v1/audit-logs/platform?limit=100'),
    refetchInterval: 5000,
  });

  const filteredLogs = logs.filter((log: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.action?.toLowerCase().includes(term) ||
      log.entity?.toLowerCase().includes(term) ||
      log.shop?.name?.toLowerCase().includes(term) ||
      log.user?.email?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Security Audit Trail</h1>
        <p className="text-sm text-slate-600 mt-1">
          Immutable platform audit trail tracking shop creation, agent pairing, and verified file destructions
        </p>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by action, entity, shop or user..."
          className="w-full glass-input pl-10 pr-4 py-2 rounded-xl text-xs border-slate-300 text-slate-900"
        />
      </div>

      {/* Logs Table */}
      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Fetching immutable audit logs...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl text-center space-y-2 border border-slate-200 bg-white shadow-sm">
          <ScrollText className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="text-sm font-bold text-slate-900">No audit records found</div>
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Timestamp (IST)</th>
                  <th className="px-6 py-3.5">Action</th>
                  <th className="px-6 py-3.5">Entity</th>
                  <th className="px-6 py-3.5">Shop</th>
                  <th className="px-6 py-3.5">Actor / Role</th>
                  <th className="px-6 py-3.5">Metadata Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-500 font-sans text-xs">
                      {new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </td>
                    <td className="px-6 py-3">
                      <span className="font-bold text-purple-700 font-mono">{log.action}</span>
                    </td>
                    <td className="px-6 py-3 text-slate-800">{log.entity}</td>
                    <td className="px-6 py-3 text-slate-600 font-sans">{log.shop?.name || '-'}</td>
                    <td className="px-6 py-3 text-slate-600 font-sans">
                      {log.user?.email || log.actorRole || 'SYSTEM'}
                    </td>
                    <td className="px-6 py-3 text-slate-500 max-w-xs truncate">
                      {JSON.stringify(log.metadataJson || {})}
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
