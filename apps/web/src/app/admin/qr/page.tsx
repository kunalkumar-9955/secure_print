'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api-client';
import {
  QrCode,
  Download,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  Loader2,
  AlertCircle,
  LogIn,
  Store,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminQrPage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [urlMode, setUrlMode] = useState<'network' | 'custom' | 'localhost'>('network');
  const [customHost, setCustomHost] = useState('');
  const [clientOrigin, setClientOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setClientOrigin(window.location.origin);
    }
  }, []);

  // 1. Authenticated user profile
  const {
    data: auth,
    isLoading: authLoading,
    isError: authError,
  } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => apiRequest('/api/v1/auth/me'),
    retry: 1,
  });

  // 2. If Super Admin, fetch all shops so they can pick a shop's QR code
  const isSuperAdmin = auth?.role === 'SUPER_ADMIN';
  const { data: shops = [] } = useQuery({
    queryKey: ['admin-qr-shops'],
    queryFn: () => apiRequest('/api/v1/shops'),
    enabled: isSuperAdmin,
  });

  // Set default shop for Super Admin
  useEffect(() => {
    if (isSuperAdmin && shops.length > 0 && !selectedShopId) {
      setSelectedShopId(shops[0].id);
    }
  }, [isSuperAdmin, shops, selectedShopId]);

  // Determine effective shopId to query
  const effectiveShopId = isSuperAdmin ? selectedShopId : auth?.shopId;

  // Resolve effectiveBaseUrl
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const resolvedNetworkBase = envAppUrl || clientOrigin || 'http://localhost:3000';

  let effectiveBaseUrl = resolvedNetworkBase;
  if (urlMode === 'localhost') {
    effectiveBaseUrl = 'http://localhost:3000';
  } else if (urlMode === 'custom' && customHost.trim()) {
    const trimmed = customHost.trim();
    effectiveBaseUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `http://${trimmed}`;
  }

  // 3. Fetch QR details for effective shop with dynamic baseUrl
  const {
    data: qr,
    isLoading: qrLoading,
    isError: qrError,
    error: qrErrorObj,
    refetch,
  } = useQuery({
    queryKey: ['shop-qr', effectiveShopId, effectiveBaseUrl],
    queryFn: () =>
      apiRequest(
        `/api/v1/shops/${effectiveShopId}/qr?baseUrl=${encodeURIComponent(effectiveBaseUrl)}`,
      ),
    enabled: !!effectiveShopId && !!effectiveBaseUrl,
    retry: 1,
  });

  const handleCopy = () => {
    if (qr?.publicUrl) {
      navigator.clipboard.writeText(qr.publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Auth Loading
  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Verifying authentication...</p>
      </div>
    );
  }

  // Not Logged In
  if (authError || !auth) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 shadow-xl rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Authentication Required</h2>
          <p className="text-sm text-slate-600">
            Please log in as a shop owner or administrator to view and print counter QR codes.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center space-x-2 w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
          >
            <span>Sign In to SecurePrint</span>
          </Link>
        </div>
      </div>
    );
  }

  // Super Admin without shops yet
  if (isSuperAdmin && shops.length === 0) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
          <Store className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">No Print Shops Available</h2>
        <p className="text-sm text-slate-600">Create a print shop first in the Super Admin console to generate its counter QR.</p>
        <Link
          href="/super-admin/shops"
          className="inline-block px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
        >
          Manage Print Shops
        </Link>
      </div>
    );
  }

  // QR Loading
  if (qrLoading || (effectiveShopId && !qr && !qrError)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Generating counter QR stand...</p>
      </div>
    );
  }

  // QR Error
  if (qrError || !qr) {
    const msg = (qrErrorObj as any)?.message || 'Failed to load shop counter QR code.';
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-4">
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center space-x-3 max-w-md">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>{msg}</div>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Permanent Shop QR</h1>
          <p className="text-sm text-slate-600 mt-1">
            Print this sheet and mount it on your shop counter for walk-in customers
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {isSuperAdmin && shops.length > 1 && (
            <select
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              className="bg-white border border-slate-300 text-slate-800 text-xs rounded-xl px-3 py-2 font-medium"
            >
              {shops.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.slug})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleCopy}
            className="inline-flex items-center space-x-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied URL' : 'Copy URL'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Counter Sheet</span>
          </button>
        </div>
      </div>

      {/* Network / QR Target Configuration Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Target URL:</span>
            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {effectiveBaseUrl}/s/{qr.shopSlug}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setUrlMode('network')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                urlMode === 'network'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Network / Wi-Fi
            </button>
            <button
              type="button"
              onClick={() => setUrlMode('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                urlMode === 'custom'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Custom Host / IP
            </button>
            <button
              type="button"
              onClick={() => setUrlMode('localhost')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                urlMode === 'localhost'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Localhost (Laptop Only)
            </button>
          </div>
        </div>

        {urlMode === 'custom' && (
          <div className="pt-2 border-t border-slate-100 flex items-center space-x-2">
            <label className="text-xs font-medium text-slate-600">Enter Host / IP:</label>
            <input
              type="text"
              value={customHost}
              onChange={(e) => setCustomHost(e.target.value)}
              placeholder="e.g. 192.168.1.100:3000 or yourdomain.com"
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono w-72 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}

        <div className="text-[11px] text-slate-500 flex items-center space-x-1.5 pt-1">
          {effectiveBaseUrl.includes('localhost') || effectiveBaseUrl.includes('127.0.0.1') ? (
            <span className="text-amber-700 font-medium">
              ⚠️ Currently using localhost. Phones scanning this QR will get connection refused unless using LAN Wi-Fi IP or production domain.
            </span>
          ) : (
            <span className="text-emerald-700 font-medium">
              ✓ Mobile Ready: Walk-in customers scanning this QR on the same Wi-Fi or public domain will open the storefront directly.
            </span>
          )}
        </div>
      </div>

      {/* Printable Counter Stand Card */}
      <div className="bg-white text-slate-900 p-8 sm:p-12 rounded-3xl shadow-xl border border-slate-200 text-center space-y-6 max-w-md mx-auto">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1 text-[11px] font-extrabold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            <span>Contactless Cloud Print</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight pt-2">{qr.shopName}</h2>
          <p className="text-xs text-slate-500">Scan to upload & print your documents directly</p>
        </div>

        {/* High-Resolution QR Code */}
        <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 inline-block shadow-inner">
          {qr.qrDataUrl && (
            <img
              src={qr.qrDataUrl}
              alt="SecurePrint Shop Permanent QR"
              className="w-64 h-64 mx-auto rounded-xl shadow-md"
            />
          )}
        </div>

        {/* Instructions */}
        <div className="space-y-2 text-xs text-slate-600 max-w-xs mx-auto">
          <div className="font-bold text-slate-900">How to print in 3 steps:</div>
          <div className="flex items-center justify-center space-x-2 text-[11px] text-slate-700">
            <span>1. Scan QR Code</span>
            <span>•</span>
            <span>2. Upload PDF / Photo</span>
            <span>•</span>
            <span>3. Collect Prints</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono pt-1">
            Works with Google Lens, iPhone Camera & WhatsApp
          </div>
        </div>

        {/* URL and Privacy Guarantee */}
        <div className="pt-4 border-t border-slate-100 text-center space-y-1">
          <div className="text-[11px] font-mono text-slate-700 font-semibold">{qr.publicUrl}</div>
          <div className="text-[10px] text-emerald-800 font-medium flex items-center justify-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Zero-Retention: Files permanently erased 10s after payment</span>
          </div>
        </div>
      </div>
    </div>
  );
}
