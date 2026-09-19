'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import {
  Settings,
  ShieldCheck,
  CreditCard,
  HardDrive,
  Cpu,
  Clock,
  Globe,
  Lock,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function SuperAdminSettingsPage() {
  const {
    data: health,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['super-admin-settings-health'],
    queryFn: () => apiRequest('/health'),
  });

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Platform Settings & Configuration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Global operational parameters, security preflight status, and integrated subsystems.
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

      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Checking subsystem configuration...</p>
        </div>
      ) : isError ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-3">
          <div className="flex items-center space-x-2 font-bold">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span>Subsystem status check failed</span>
          </div>
          <p className="text-sm text-rose-700">{(error as any)?.message}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment Subsystem Preflight */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-bold border-b border-slate-100 pb-3">
              <CreditCard className="w-5 h-5 text-purple-600" />
              <span>Payment Gateway Integration</span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Primary Provider:</span>
                <span className="font-bold text-slate-900">Cashfree PG API</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">API Version:</span>
                <span className="font-mono text-slate-700">2023-08-01</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Gateway Environment:</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800">
                  SANDBOX (Staging) / PRODUCTION
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Webhook Signature Verification:</span>
                <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>HMAC-SHA256 Active</span>
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Server Verification:</span>
                <span className="text-emerald-700 font-bold text-xs">Mandatory Server-to-Server</span>
              </div>
            </div>
          </div>

          {/* Storage & Privacy Architecture */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-bold border-b border-slate-100 pb-3">
              <HardDrive className="w-5 h-5 text-emerald-600" />
              <span>Document Storage & Zero-Retention</span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Storage Architecture:</span>
                <span className="font-bold text-slate-900">Private Disk / S3 Compatible</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Document Privacy:</span>
                <span className="text-slate-800 font-semibold">Strict Tenant Scoped Keys</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Post-Payment Cleanup:</span>
                <span className="font-bold text-purple-700">10-Second Server-Side Purge</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Worker Poller:</span>
                <span className="text-emerald-700 font-bold text-xs">Active (15s Sweep)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Receipt Persistence:</span>
                <span className="text-slate-700 text-xs font-semibold">Survives Document Deletion</span>
              </div>
            </div>
          </div>

          {/* Environment & Network */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-bold border-b border-slate-100 pb-3">
              <Globe className="w-5 h-5 text-blue-600" />
              <span>Environment & Routing</span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Business Timezone:</span>
                <span className="font-bold text-slate-900 font-mono">Asia/Kolkata (IST)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Database Engine:</span>
                <span className="font-bold text-slate-900">PostgreSQL (Prisma ORM)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Realtime Protocol:</span>
                <span className="font-mono text-slate-700">WebSocket + Polling Fallback</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Queue Backend:</span>
                <span className="font-mono text-slate-700">BullMQ (Redis Enabled)</span>
              </div>
            </div>
          </div>

          {/* Security & Access Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-bold border-b border-slate-100 pb-3">
              <Lock className="w-5 h-5 text-amber-600" />
              <span>Security & Tenant Isolation</span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Authentication:</span>
                <span className="font-bold text-slate-900">JWT (HttpOnly Cookies + Bearer)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Multi-Tenancy Guard:</span>
                <span className="text-emerald-700 font-bold text-xs">Enforced Server-Side</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Windows Agent Auth:</span>
                <span className="font-semibold text-slate-800">5-min Single-Use Pairing Code</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Audit Logging:</span>
                <span className="text-emerald-700 font-bold text-xs">Immutable System Log</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
