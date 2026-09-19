'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import {
  Store,
  ShieldCheck,
  Ban,
  ArrowLeft,
  Users,
  Monitor,
  Printer,
  CreditCard,
  Calendar,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Phone,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';

export default function SuperAdminShopDetailPage() {
  const params = useParams();
  const router = useRouter();
  const shopId = params?.shopId as string;
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: shop,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['super-admin-shop-detail', shopId],
    queryFn: () => apiRequest(`/api/v1/shops/${shopId}`),
    enabled: !!shopId,
  });

  const handleUpdateStatus = async (newStatus: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await apiRequest(`/api/v1/shops/${shopId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      await refetch();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update shop status.');
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading shop details...</p>
      </div>
    );
  }

  if (isError || !shop) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <button
          onClick={() => router.push('/super-admin/shops')}
          className="inline-flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Print Shops</span>
        </button>
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-3">
          <div className="flex items-center space-x-2 font-bold">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span>Failed to load print shop</span>
          </div>
          <p className="text-sm text-rose-700">
            {(error as any)?.message || 'Print shop not found or access was denied.'}
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

  const activeSub = shop.subscriptions?.[0];

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/super-admin/shops')}
          className="inline-flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Print Shops</span>
        </button>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{shop.name}</h1>
              <span
                className={`px-3 py-1 text-xs font-bold rounded-full ${
                  shop.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : shop.status === 'PENDING_PAYMENT'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {shop.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-sm text-slate-500 flex items-center space-x-2">
              <span>Slug: <strong className="font-mono text-slate-800">/{shop.slug}</strong></span>
              <span>•</span>
              <a
                href={`/s/${shop.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-purple-600 hover:underline inline-flex items-center space-x-1"
              >
                <span>Customer QR Link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          {/* Status Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {shop.status !== 'ACTIVE' && (
              <button
                onClick={() => handleUpdateStatus('ACTIVE')}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Activate Shop</span>
              </button>
            )}

            {shop.status !== 'SUSPENDED' && (
              <button
                onClick={() => handleUpdateStatus('SUSPENDED')}
                disabled={actionLoading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                <Ban className="w-4 h-4" />
                <span>Suspend</span>
              </button>
            )}

            {shop.status !== 'DISABLED' && (
              <button
                onClick={() => handleUpdateStatus('DISABLED')}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                <Ban className="w-4 h-4" />
                <span>Disable</span>
              </button>
            )}
          </div>
        </div>

        {/* Contact info row */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{shop.address || 'No physical address provided'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{shop.phone || 'No phone provided'}</span>
          </div>
        </div>
      </div>

      {/* Grid: Subscription, Staff, Agents, Printers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subscription Info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-bold border-b border-slate-100 pb-3">
            <CreditCard className="w-5 h-5 text-purple-600" />
            <span>SaaS Subscription</span>
          </div>

          {activeSub ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Plan:</span>
                <span className="font-bold text-slate-900">{activeSub.plan?.name || 'Pro Plan'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Tier:</span>
                <span className="font-semibold text-purple-700 uppercase">{activeSub.plan?.tier || 'PRO'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Status:</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  {activeSub.status}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Current Period:</span>
                <span className="text-xs text-slate-700">
                  {new Date(activeSub.currentPeriodStart).toLocaleDateString()} – {new Date(activeSub.currentPeriodEnd).toLocaleDateString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 rounded-xl text-amber-800 text-sm">
              No active subscription found. Shop is currently in {shop.status} mode.
            </div>
          )}
        </div>

        {/* Shopkeepers & Users */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-bold border-b border-slate-100 pb-3">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Shop Members ({shop.users?.length || 0})</span>
          </div>

          {shop.users && shop.users.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {shop.users.map((u: any) => (
                <div key={u.id} className="py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-semibold text-slate-800">{u.name}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No registered users for this shop.</p>
          )}
        </div>

        {/* Desktop Agents */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-bold border-b border-slate-100 pb-3">
            <Monitor className="w-5 h-5 text-emerald-600" />
            <span>Desktop Agents ({shop.desktopAgents?.length || 0})</span>
          </div>

          {shop.desktopAgents && shop.desktopAgents.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {shop.desktopAgents.map((a: any) => (
                <div key={a.id} className="py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-semibold text-slate-800">{a.machineName}</div>
                    <div className="text-xs text-slate-500">Version: {a.agentVersion || '1.0.0'}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                      a.status === 'ONLINE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No desktop agent paired yet.</p>
          )}
        </div>

        {/* Registered Printers */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-bold border-b border-slate-100 pb-3">
            <Printer className="w-5 h-5 text-indigo-600" />
            <span>Discovered Printers ({shop.printers?.length || 0})</span>
          </div>

          {shop.printers && shop.printers.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {shop.printers.map((p: any) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-semibold text-slate-800">{p.windowsPrinterName}</div>
                    <div className="text-xs text-slate-500">{p.driverName || 'Generic Spooler'}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                      p.status === 'READY'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No physical printers discovered yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
