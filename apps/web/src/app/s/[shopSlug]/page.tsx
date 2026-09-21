'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import {
  Printer,
  MapPin,
  Phone,
  ArrowRight,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function ShopLandingPage() {
  const params = useParams();
  const shopSlug = (params?.shopSlug as string) || '';

  const {
    data: shop,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['public-shop', shopSlug],
    queryFn: () => apiRequest(`/api/v1/shops/public/${shopSlug}`),
    enabled: !!shopSlug,
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4 animate-pulse shadow-sm">
          <Printer className="w-6 h-6" />
        </div>
        <div className="flex items-center space-x-2 text-slate-600 font-medium text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Connecting to SecurePrint Counter...</span>
        </div>
      </div>
    );
  }

  if (isError || !shop) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-900">Print Shop Not Available</h1>
            <p className="text-xs text-slate-500">
              The requested print counter ({shopSlug || 'unknown'}) is currently offline or unreachable.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check Counter Again</span>
          </button>
        </div>
      </div>
    );
  }

  const pricing = shop.shopSettings?.pricingRulesJson || {
    ratePerBwPage: 2.0,
    ratePerColorPage: 10.0,
    duplexDiscountPercent: 10,
    currency: 'INR',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div className="max-w-md w-full mx-auto space-y-6 pt-4 sm:pt-8">
        {/* Brand Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
              <Printer className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-900">SecurePrint Counter</span>
          </div>
          <div className="inline-flex items-center space-x-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Encrypted Session</span>
          </div>
        </div>

        {/* Shop Info Card */}
        <div className="bg-white p-6 rounded-2xl space-y-4 shadow-sm border border-slate-200">
          <div className="space-y-1">
            <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-600">
              Official Print Partner
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{shop.name}</h1>
          </div>

          <div className="space-y-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
            {shop.address && (
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <span>{shop.address}</span>
              </div>
            )}
            {shop.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>{shop.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Counter Pricing Card */}
        <div className="bg-white p-6 rounded-2xl space-y-4 shadow-sm border border-slate-200">
          <h2 className="text-xs uppercase font-bold tracking-wider text-slate-500">Counter Pricing</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
              <div className="text-xs text-slate-500 font-medium">B&W Document</div>
              <div className="text-xl font-extrabold text-slate-900">
                ₹{pricing.ratePerBwPage}
                <span className="text-[11px] text-slate-500 font-normal"> / page</span>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
              <div className="text-xs text-emerald-700 font-medium">Color Document</div>
              <div className="text-xl font-extrabold text-emerald-700">
                ₹{pricing.ratePerColorPage}
                <span className="text-[11px] text-emerald-600 font-normal"> / page</span>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 text-center flex items-center justify-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{pricing.duplexDiscountPercent}% discount applied automatically for two-sided duplex</span>
          </div>
        </div>

        {/* 10-Second Privacy Notice */}
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
          <div className="font-semibold flex items-center space-x-1.5 text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Automatic Document Shredding</span>
          </div>
          <p className="text-emerald-700 text-[11px] leading-relaxed">
            Your files are private. Documents are permanently erased from both cloud storage and shop
            computers 10 seconds after verified payment.
          </p>
        </div>

        {/* Start Button */}
        <Link
          href={`/s/${shop.slug}/start`}
          className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-sm transition-all text-base tracking-wide"
        >
          <FileText className="w-5 h-5" />
          <span>Start Printing Document</span>
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>

      <div className="text-center text-[11px] text-slate-400 py-4">
        SecurePrint Cloud • Zero-Retention Printing Architecture
      </div>
    </div>
  );
}

