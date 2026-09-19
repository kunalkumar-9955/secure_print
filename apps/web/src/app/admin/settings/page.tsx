'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { Settings, Save, CheckCircle2, AlertCircle, Loader2, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function AdminSettingsPage() {
  const [rateBw, setRateBw] = useState<number>(2.0);
  const [rateColor, setRateColor] = useState<number>(10.0);
  const [a3Mult, setA3Mult] = useState<number>(2.0);
  const [legalMult, setLegalMult] = useState<number>(1.2);
  const [duplexDiscount, setDuplexDiscount] = useState<number>(10);
  const [minOrder, setMinOrder] = useState<number>(2.0);
  const [cashAccepted, setCashAccepted] = useState<boolean>(true);
  const [autoPrint, setAutoPrint] = useState<boolean>(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: auth, isLoading: authLoading, isError: authError } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => apiRequest('/api/v1/auth/me'),
    retry: 1,
  });

  const shopId = auth?.shopId;

  const { data: shop, isLoading } = useQuery({
    queryKey: ['shop-details', shopId],
    queryFn: () => apiRequest(`/api/v1/shops/${shopId}`),
    enabled: !!shopId,
  });

  useEffect(() => {
    if (shop?.shopSettings?.pricingRulesJson) {
      const p = shop.shopSettings.pricingRulesJson;
      if (p.ratePerBwPage) setRateBw(p.ratePerBwPage);
      if (p.ratePerColorPage) setRateColor(p.ratePerColorPage);
      if (p.rateA3Multiplier) setA3Mult(p.rateA3Multiplier);
      if (p.rateLegalMultiplier) setLegalMult(p.rateLegalMultiplier);
      if (p.duplexDiscountPercent) setDuplexDiscount(p.duplexDiscountPercent);
      if (p.minimumOrderAmount) setMinOrder(p.minimumOrderAmount);
      setCashAccepted(shop.shopSettings.cashAccepted ?? true);
      setAutoPrint(shop.shopSettings.autoPrintEnabled ?? false);
    }
  }, [shop]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      await apiRequest(`/api/v1/shops/${shopId}/settings`, {
        method: 'PATCH',
        body: JSON.stringify({
          pricingRules: {
            ratePerBwPage: Number(rateBw),
            ratePerColorPage: Number(rateColor),
            rateA3Multiplier: Number(a3Mult),
            rateLegalMultiplier: Number(legalMult),
            duplexDiscountPercent: Number(duplexDiscount),
            minimumOrderAmount: Number(minOrder),
            currency: 'INR',
          },
          autoPrintEnabled: autoPrint,
          cashAccepted,
        }),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || (shopId && isLoading)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading shop settings...</p>
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
            Please log in with your shop credentials to configure pricing and operational preferences.
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl w-full mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Shop Preferences & Pricing</h1>
        <p className="text-sm text-slate-600 mt-1">
          Customize counter pricing rates and payment methods for {shop?.name}
        </p>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Shop pricing settings updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Pricing Matrix Card */}
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Settings className="w-4 h-4 text-emerald-600" />
            <span>Document Print Rates (INR)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Rate per B&W Page (₹)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={rateBw}
                onChange={(e) => setRateBw(parseFloat(e.target.value) || 0)}
                className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-bold border-slate-300 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Rate per Color Page (₹)
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={rateColor}
                onChange={(e) => setRateColor(parseFloat(e.target.value) || 0)}
                className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-bold border-slate-300 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                A3 Paper Multiplier (x)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                value={a3Mult}
                onChange={(e) => setA3Mult(parseFloat(e.target.value) || 1)}
                className="w-full glass-input px-4 py-2.5 rounded-xl text-sm border-slate-300 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Legal Paper Multiplier (x)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                value={legalMult}
                onChange={(e) => setLegalMult(parseFloat(e.target.value) || 1)}
                className="w-full glass-input px-4 py-2.5 rounded-xl text-sm border-slate-300 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Duplex (Two-Sided) Discount (%)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                max="50"
                value={duplexDiscount}
                onChange={(e) => setDuplexDiscount(parseInt(e.target.value, 10) || 0)}
                className="w-full glass-input px-4 py-2.5 rounded-xl text-sm border-slate-300 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Minimum Order Amount (₹)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                value={minOrder}
                onChange={(e) => setMinOrder(parseFloat(e.target.value) || 1)}
                className="w-full glass-input px-4 py-2.5 rounded-xl text-sm border-slate-300 text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Operational Preferences */}
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">Payment & Counter Options</h2>

          <div className="flex items-center justify-between py-2 border-b border-slate-200">
            <div>
              <div className="text-sm font-semibold text-slate-900">Accept Cash at Counter</div>
              <div className="text-xs text-slate-500">Allow customers to choose cash payment at checkout</div>
            </div>
            <input
              type="checkbox"
              checked={cashAccepted}
              onChange={(e) => setCashAccepted(e.target.checked)}
              className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Shop Settings</span>
        </button>
      </form>
    </div>
  );
}
