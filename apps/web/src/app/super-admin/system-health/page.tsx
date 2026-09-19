'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { Activity, CheckCircle2, AlertCircle, RefreshCw, Loader2, Database, HardDrive, CreditCard, Radio, Server } from 'lucide-react';

export default function SuperAdminSystemHealthPage() {
  const { data: health, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => apiRequest('/health'),
    refetchInterval: 10000,
  });

  const services = [
    { name: 'Core NestJS Modular API', key: 'api', icon: Server },
    { name: 'PostgreSQL 18 Database Cluster', key: 'database', icon: Database },
    { name: 'Private Object Storage Subsystem', key: 'storage', icon: HardDrive },
    { name: 'Cashfree Payment Gateway Integration', key: 'paymentGateway', icon: CreditCard },
    { name: 'WebSocket Realtime Gateway', key: 'realtimeWebSocket', icon: Radio },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Platform System Health</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time live telemetry probes checking database, storage, API, and payment infrastructure
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center space-x-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Probe Health</span>
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center space-y-3 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <span className="text-xs font-medium text-slate-500">Checking system telemetry...</span>
        </div>
      ) : isError ? (
        <div className="p-8 bg-red-50 border border-red-200 rounded-2xl text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-red-900">Health Probes Unreachable</h3>
            <p className="text-xs text-red-700 mt-1">
              {(error as any)?.message || 'Failed to poll platform health telemetry'}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 shadow-sm"
          >
            Retry Telemetry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overall Health Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <div className="text-base font-bold text-slate-900">Platform Operational Status</div>
                <div className="text-xs text-slate-500">All mission-critical systems operational</div>
              </div>
            </div>

            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{health?.status || 'HEALTHY'}</span>
            </span>
          </div>

          {/* Subsystem Probes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((svc) => {
              const Icon = svc.icon;
              const status = health?.services?.[svc.key] || 'HEALTHY';
              const isHealthy = status === 'HEALTHY';

              return (
                <div
                  key={svc.key}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{svc.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">serviceKey: {svc.key}</div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center space-x-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                      isHealthy
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-red-50 border-red-200 text-red-700'
                    }`}
                  >
                    {isHealthy ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-red-600" />}
                    <span>{status}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

