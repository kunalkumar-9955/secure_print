'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { CreditCard, CheckCircle2, ShieldCheck, Zap, Loader2, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function AdminSubscriptionPage() {
  const [activating, setActivating] = useState<string | null>(null);

  const { data: auth, isLoading: authLoading, isError: authError } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => apiRequest('/api/v1/auth/me'),
    retry: 1,
  });

  const shopId = auth?.shopId;

  const { data: sub, isLoading: subLoading, refetch: refetchSub } = useQuery({
    queryKey: ['shop-sub', shopId],
    queryFn: () => apiRequest(`/api/v1/subscriptions/shop/${shopId}`),
    enabled: !!shopId,
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => apiRequest('/api/v1/subscriptions/plans'),
  });

  const handleActivate = async (planId: string) => {
    setActivating(planId);
    try {
      await apiRequest(`/api/v1/subscriptions/shop/${shopId}/activate`, {
        method: 'POST',
        body: JSON.stringify({
          planId,
          providerRef: `WEB_CASHFREE_${Date.now()}`,
        }),
      });
      await refetchSub();
      alert('Subscription successfully activated! All operational features unlocked.');
    } catch (err: any) {
      alert(`Activation error: ${err.message}`);
    } finally {
      setActivating(null);
    }
  };

  if (authLoading || (shopId && subLoading) || plansLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading subscription data...</p>
      </div>
    );
  }

  if (authError || !auth) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 shadow-xl rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Sign In Required</h2>
          <p className="text-sm text-slate-600">
            Please log in with your shop credentials to view and manage your SaaS subscription.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center space-x-2 w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
          >
            <span>Sign In</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">SaaS Subscription & Billing</h1>
        <p className="text-sm text-slate-600 mt-1">Manage your shop&apos;s SecurePrint plan and active quota</p>
      </div>

      {/* Active Subscription Banner */}
      {sub ? (
        <div className="glass-card p-6 rounded-2xl border border-emerald-200 bg-emerald-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">Current Plan</span>
            <div className="text-2xl font-black text-slate-900">{sub.plan?.name}</div>
            <div className="text-xs text-slate-600">
              Billing Interval: <strong className="text-slate-800">{sub.plan?.interval}</strong> • Next renewal on{' '}
              <strong className="text-slate-900">
                {new Date(sub.currentPeriodEnd).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </strong>
            </div>
          </div>

          <div className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>ACTIVE & VERIFIED</span>
          </div>
        </div>
      ) : (
        <div className="glass-card p-6 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-2">
          <div className="text-sm font-bold text-amber-800">No Active SaaS Subscription</div>
          <p className="text-xs text-slate-600">
            Select a plan below to activate your shop and unlock customer file uploads and Windows agent printing.
          </p>
        </div>
      )}

      {/* Available Plans */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Available SaaS Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p: any) => {
            const isCurrent = sub?.planId === p.id;
            const isWorking = activating === p.id;
            const features = Array.isArray(p.featuresJson) ? p.featuresJson : [];

            return (
              <div
                key={p.id}
                className={`glass-card p-6 rounded-2xl border space-y-6 flex flex-col justify-between bg-white shadow-sm ${
                  isCurrent ? 'border-emerald-500 shadow-md shadow-emerald-500/10' : 'border-slate-200'
                }`}
              >
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                    <div className="text-3xl font-black text-slate-900">
                      ₹{Number(p.price).toFixed(0)}
                      <span className="text-xs text-slate-500 font-normal"> / month</span>
                    </div>
                  </div>

                  <ul className="space-y-2 text-xs text-slate-600">
                    {features.map((f: string, idx: number) => (
                      <li key={idx} className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleActivate(p.id)}
                  disabled={isCurrent || isWorking}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition-all ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-400 cursor-default'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                  }`}
                >
                  {isWorking ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : (
                    'Activate with Cashfree'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
