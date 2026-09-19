'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { CreditCard, Plus, CheckCircle2, Loader2, X } from 'lucide-react';

export default function SuperAdminPlansPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [tier, setTier] = useState('CUSTOM');
  const [price, setPrice] = useState('999');
  const [interval, setInterval] = useState('MONTHLY');
  const [featuresText, setFeaturesText] = useState('Priority Spooling\nRealtime Queue\nCustom Pricing');
  const [creating, setCreating] = useState(false);

  const { data: plans = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => apiRequest('/api/v1/subscriptions/plans'),
  });

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const features = featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      await apiRequest('/api/v1/subscriptions/plans', {
        method: 'POST',
        body: JSON.stringify({
          name,
          tier,
          price: parseFloat(price),
          interval,
          features,
          limits: {},
        }),
      });

      setModalOpen(false);
      setName('');
      await refetch();
    } catch (err: any) {
      alert(`Could not create plan: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">SaaS Subscription Plans</h1>
          <p className="text-sm text-slate-600 mt-1">Configure pricing tiers and quota limits for print shopkeepers</p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-purple-600/20 text-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Plan</span>
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading subscription tiers...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p: any) => {
            const features = Array.isArray(p.featuresJson) ? p.featuresJson : [];

            return (
              <div
                key={p.id}
                className="glass-card p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-6 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {p.tier}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{p.interval}</span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
                    <div className="text-3xl font-black text-slate-900 mt-1">
                      ₹{Number(p.price).toFixed(0)}
                      <span className="text-xs text-slate-500 font-normal"> / {p.interval.toLowerCase()}</span>
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
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 rounded-2xl border border-slate-200 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900">Create SaaS Plan</h3>

            <form onSubmit={handleCreatePlan} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Standard Shop Plan"
                  className="w-full glass-input px-3 py-2 rounded-xl border-slate-300 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tier</label>
                  <select
                    value={tier}
                    onChange={(e) => setTier(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl border-slate-300 text-slate-900 bg-white"
                  >
                    <option value="STARTER">Starter</option>
                    <option value="PROFESSIONAL">Professional</option>
                    <option value="ENTERPRISE">Enterprise</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Monthly Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Billing Interval</label>
                <select
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl border-slate-300 text-slate-900 bg-white"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Features (one per line)</label>
                <textarea
                  rows={3}
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl border-slate-300 text-slate-900 font-mono text-[11px]"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl shadow-md shadow-purple-600/20 mt-2"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create Plan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
