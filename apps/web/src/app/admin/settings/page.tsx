'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { Settings, Save, CheckCircle2, AlertCircle, Loader2, LogIn, CreditCard, ExternalLink, ShieldCheck, Key } from 'lucide-react';
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

  // Cashfree PG state
  const [pgAppId, setPgAppId] = useState('');
  const [pgSecretKey, setPgSecretKey] = useState('');
  const [pgWebhookSecret, setPgWebhookSecret] = useState('');
  const [pgEnv, setPgEnv] = useState<'SANDBOX' | 'PRODUCTION'>('SANDBOX');
  const [savingPg, setSavingPg] = useState(false);
  const [pgMessage, setPgMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const { data: pgConfig, refetch: refetchPg } = useQuery({
    queryKey: ['payment-config', shopId],
    queryFn: () => apiRequest(`/api/v1/payments/config/${shopId}`),
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

  useEffect(() => {
    if (pgConfig?.environment) {
      setPgEnv(pgConfig.environment);
    }
  }, [pgConfig]);

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

  const handleSavePg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPg(true);
    setPgMessage(null);

    try {
      const res = await apiRequest(`/api/v1/payments/config/${shopId}`, {
        method: 'POST',
        body: JSON.stringify({
          appId: pgAppId.trim(),
          secretKey: pgSecretKey.trim(),
          webhookSecret: pgWebhookSecret.trim() || undefined,
          environment: pgEnv,
        }),
      });

      setPgMessage({
        type: 'success',
        text: res.message || 'Cashfree credentials verified & activated successfully!',
      });
      setPgSecretKey('');
      refetchPg();
    } catch (err: any) {
      setPgMessage({
        type: 'error',
        text: err.message || 'Failed to verify Cashfree credentials. Check your App ID and Secret Key.',
      });
    } finally {
      setSavingPg(false);
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
            className="inline-flex items-center justify-center space-x-2 w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all"
          >
            <span>Go to Login</span>
          </Link>
        </div>
      </div>
    );
  }

  const isPgConfigured = pgConfig?.isConfigured;

  return (
    <div className="flex-1 max-w-4xl mx-auto space-y-8 p-4 sm:p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Shop Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure page pricing, payment gateways, and operational preferences for {shop?.name || 'your shop'}.
        </p>
      </div>

      {saved && (
        <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Pricing rules saved successfully! Live customer uploads will instantly reflect these rates.</span>
        </div>
      )}

      {/* Online Payment Gateway (Cashfree PG) */}
      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Online Payment Gateway (Cashfree PG)</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Enable instant UPI, Google Pay, PhonePe, Paytm, Credit & Debit Cards at your counter.
            </p>
          </div>
          <div>
            {isPgConfigured ? (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>ACTIVE ({pgConfig.environment})</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>NOT CONFIGURED</span>
              </span>
            )}
          </div>
        </div>

        {pgMessage && (
          <div className={`p-4 rounded-xl text-xs font-semibold flex items-start space-x-2 border ${
            pgMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {pgMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">{pgMessage.text}</div>
          </div>
        )}

        {isPgConfigured && pgConfig?.appIdMasked && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
            <div>
              <span className="text-slate-500">Active App ID: </span>
              <span className="font-mono font-bold text-slate-900">{pgConfig.appIdMasked}</span>
              {pgConfig.isPlatformDefault && (
                <span className="ml-2 text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold">Platform Default</span>
              )}
            </div>
            <div className="text-[11px] text-slate-500">
              Credentials encrypted with AES-256-GCM.
            </div>
          </div>
        )}

        <form onSubmit={handleSavePg} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Cashfree Environment
              </label>
              <select
                value={pgEnv}
                onChange={(e) => setPgEnv(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 bg-white text-slate-900"
              >
                <option value="SANDBOX">Sandbox / Testing (sandbox.cashfree.com)</option>
                <option value="PRODUCTION">Production / Live (api.cashfree.com)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Cashfree App ID (Client ID)
              </label>
              <input
                type="text"
                required
                placeholder={pgConfig?.appIdMasked || 'e.g. TEST10123456789...'}
                value={pgAppId}
                onChange={(e) => setPgAppId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-xs font-mono border border-slate-300 bg-white text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Cashfree Secret Key
              </label>
              <input
                type="password"
                required
                placeholder="Enter your Cashfree Secret Key"
                value={pgSecretKey}
                onChange={(e) => setPgSecretKey(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-xs font-mono border border-slate-300 bg-white text-slate-900"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <a
              href="https://merchant.cashfree.com/merchants/login"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center space-x-1"
            >
              <span>Get API Keys from Cashfree Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="submit"
              disabled={savingPg || !pgAppId || !pgSecretKey}
              className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-sm transition-all"
            >
              {savingPg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4 text-emerald-400" />}
              <span>Verify & Save Gateway</span>
            </button>
          </div>
        </form>
      </div>

      {/* Pricing Rules Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900">Per-Page Print Pricing (₹)</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                className="w-full px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-300 text-slate-900"
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
                className="w-full px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-300 text-slate-900"
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
                className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-300 text-slate-900"
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
                className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-300 text-slate-900"
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
                className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-300 text-slate-900"
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
                className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-300 text-slate-900"
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
          <span>Save Pricing Settings</span>
        </button>
      </form>
    </div>
  );
}
