'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { Store, Plus, ShieldCheck, AlertCircle, Loader2, X, Check, Ban } from 'lucide-react';

export default function SuperAdminShopsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: shops = [], isLoading, refetch } = useQuery({
    queryKey: ['super-admin-shops'],
    queryFn: () => apiRequest('/api/v1/shops'),
  });

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      await apiRequest('/api/v1/shops', {
        method: 'POST',
        body: JSON.stringify({
          name,
          slug: slug.toLowerCase().trim(),
          address,
          phone,
          ownerName,
          ownerEmail,
          ownerPassword,
        }),
      });

      setModalOpen(false);
      setName('');
      setSlug('');
      setAddress('');
      setPhone('');
      setOwnerName('');
      setOwnerEmail('');
      setOwnerPassword('');
      await refetch();
    } catch (err: any) {
      setError(err.message || 'Failed to create shop.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (shopId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await apiRequest(`/api/v1/shops/${shopId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      await refetch();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Print Shops</h1>
          <p className="text-sm text-slate-600 mt-1">Multi-tenant cyber cafes, photocopy centers and campus shops</p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-purple-600/20 text-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Onboard New Shop</span>
        </button>
      </div>

      {/* Shops Table */}
      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading onboarded print shops...</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Shop Details</th>
                  <th className="px-6 py-4">Public Slug / URL</th>
                  <th className="px-6 py-4">Shop Owner</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">SaaS Subscription</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shops.map((s: any) => {
                  const owner = s.users?.[0];
                  const sub = s.subscriptions?.[0];

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{s.address || 'No address'}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-purple-700 text-[11px] font-semibold">
                        /s/{s.slug}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{owner?.name || 'Unassigned'}</div>
                        <div className="text-[11px] text-slate-500">{owner?.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                            s.status === 'ACTIVE'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : s.status === 'PENDING_PAYMENT'
                              ? 'bg-amber-50 border-amber-200 text-amber-800'
                              : 'bg-red-50 border-red-200 text-red-700'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {sub?.plan?.name || 'No Active Plan'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleToggleStatus(s.id, s.status)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11px] shadow-sm transition-colors"
                        >
                          {s.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Onboarding Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900">Onboard New Print Shop</h3>
              <p className="text-xs text-slate-500">
                New shops are created in PENDING_PAYMENT status until verified subscription.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateShop} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Shop Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Metro Xerox & Print"
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Public Slug (for permanent QR)
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="e.g. metro-xerox"
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Counter 4, City College Gate"
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 00000"
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs border-slate-300 text-slate-900"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-3">
                <div className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                  Initial Shop Owner
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Name</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Amit Kumar"
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Email</label>
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="owner@metroprint.com"
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Password</label>
                  <input
                    type="password"
                    required
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs shadow-md shadow-purple-600/20 mt-2 transition-all"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create Shop (PENDING_PAYMENT)'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
