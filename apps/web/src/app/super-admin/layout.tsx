'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShieldAlert,
  LayoutDashboard,
  Store,
  CreditCard,
  ScrollText,
  Activity,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Users,
  DollarSign,
  Smartphone,
  BarChart3,
  Settings,
} from 'lucide-react';
import { apiRequest } from '@/lib/api-client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, LogIn, UserX } from 'lucide-react';

const navItems = [
  { href: '/super-admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/super-admin/shops', label: 'Print Shops', icon: Store },
  { href: '/super-admin/shopkeepers', label: 'Shopkeepers', icon: Users },
  { href: '/super-admin/subscriptions', label: 'Subscriptions', icon: ShieldCheck },
  { href: '/super-admin/plans', label: 'SaaS Plans', icon: CreditCard },
  { href: '/super-admin/payments', label: 'Platform Payments', icon: DollarSign },
  { href: '/super-admin/customer-sessions', label: 'Customer Sessions', icon: Smartphone },
  { href: '/super-admin/analytics', label: 'Platform Analytics', icon: BarChart3 },
  { href: '/super-admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { href: '/super-admin/system-health', label: 'System Health', icon: Activity },
  { href: '/super-admin/settings', label: 'Platform Settings', icon: Settings },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const {
    data: auth,
    isLoading: authLoading,
    isError: authError,
  } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => apiRequest('/api/v1/auth/me'),
    retry: 1,
  });

  const handleLogout = async () => {
    try {
      await apiRequest('/api/v1/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  const isSuperAdmin = auth?.role?.toString().trim().toUpperCase() === 'SUPER_ADMIN';

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Verifying platform administrator credentials...</p>
      </div>
    );
  }

  if (authError || !auth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 shadow-xl rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center mx-auto">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Sign In Required</h2>
          <p className="text-sm text-slate-600">
            Please log in with your Super Admin credentials to access platform oversight.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center space-x-2 w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all"
          >
            <span>Sign In as Super Admin</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 shadow-xl rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
            <UserX className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Super Admin Required</h2>
          <p className="text-sm text-slate-600">
            You are currently authenticated as <strong className="text-slate-900">{auth.email}</strong> with role{' '}
            <code className="bg-slate-100 text-purple-700 px-1.5 py-0.5 rounded font-mono font-bold text-xs">{auth.role}</code>.
            This console is strictly restricted to platform administrators.
          </p>
          <div className="space-y-2 pt-2">
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center space-x-2 w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all"
            >
              <span>Switch to Super Admin Account</span>
            </button>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center space-x-2 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
            >
              <span>Return to Shop Console</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-slate-900 text-base">Super Admin</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex flex-col justify-between p-6">
          <div className="bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-slate-400">Platform Oversight</span>
              <button onClick={() => setMobileOpen(false)}>
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium ${
                      isActive ? 'bg-purple-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 w-full"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col justify-between w-64 border-r border-slate-200 bg-white p-6 flex-shrink-0">
        <div className="space-y-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-slate-900 text-base leading-none">SecurePrint</div>
              <div className="text-[11px] text-purple-700 font-semibold mt-1">Super Admin Console</div>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-200 space-y-4">
          <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-3 space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-purple-700 tracking-wider">Signed In Root Admin</div>
            <div className="text-xs font-bold text-slate-900 truncate">{auth?.name || 'Super Administrator'}</div>
            <div className="text-[11px] text-slate-500 font-mono truncate">{auth?.email}</div>
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Multi-Tenant Root Control</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
