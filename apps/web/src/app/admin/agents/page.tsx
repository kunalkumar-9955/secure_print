'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import {
  Monitor,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  LogIn,
  Download,
  Copy,
  Check,
  Printer,
  RefreshCw,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminAgentsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes in seconds
  const [pairingStatus, setPairingStatus] = useState<'WAITING' | 'CONNECTED' | 'EXPIRED'>('WAITING');
  const [connectedAgent, setConnectedAgent] = useState<any | null>(null);

  const { data: auth, isLoading: authLoading, isError: authError } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => apiRequest('/api/v1/auth/me'),
    retry: 1,
  });

  const shopId = auth?.shopId;

  const { data: agents = [], isLoading, refetch } = useQuery({
    queryKey: ['shop-agents', shopId],
    queryFn: () => apiRequest(`/api/v1/agents/shop/${shopId}`),
    enabled: !!shopId,
    refetchInterval: 3000,
  });

  // Countdown timer for pairing code
  useEffect(() => {
    if (!modalOpen || pairingStatus !== 'WAITING') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setPairingStatus('EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [modalOpen, pairingStatus]);

  // Polling pairing status while modal is open
  useEffect(() => {
    if (!modalOpen || !pairingCode || !shopId || pairingStatus !== 'WAITING') return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await apiRequest(`/api/v1/agents/pairing-code/status/${pairingCode}?shopId=${shopId}`);
        if (res.status === 'CONNECTED') {
          setPairingStatus('CONNECTED');
          setConnectedAgent(res.agent);
          refetch();
        } else if (res.status === 'EXPIRED') {
          setPairingStatus('EXPIRED');
        }
      } catch {
        // Silently retry on next tick
      }
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [modalOpen, pairingCode, shopId, pairingStatus, refetch]);

  const handleGenerateCode = async () => {
    setCodeLoading(true);
    setCopied(false);
    setPairingStatus('WAITING');
    setConnectedAgent(null);
    setTimeLeft(300);

    try {
      const res = await apiRequest('/api/v1/agents/pairing-code', {
        method: 'POST',
        body: JSON.stringify({ shopId }),
      });
      setPairingCode(res.pairingCode);
      setModalOpen(true);
    } catch (err: any) {
      alert(`Could not generate pairing code: ${err.message}`);
    } finally {
      setCodeLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteAgent = async (agentId: string, machineName: string) => {
    if (!confirm(`Are you sure you want to disconnect and remove computer "${machineName}"?`)) return;
    try {
      await apiRequest(`/api/v1/agents/${agentId}`, { method: 'DELETE' });
      refetch();
    } catch (err: any) {
      alert(`Could not remove agent: ${err.message}`);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Verifying shop credentials...</p>
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
            Please log in with your shop credentials to pair and manage Windows desktop print agents.
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Windows Print Agents
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Connected Windows counter PCs running the SecurePrint native agent for direct spooler printing
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href="/SecurePrint-Windows-Agent.zip"
            download="SecurePrint-Windows-Agent.zip"
            className="inline-flex items-center space-x-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all text-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Download Agent (.ZIP)</span>
          </a>

          <button
            onClick={handleGenerateCode}
            disabled={codeLoading}
            className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition-all text-xs"
          >
            {codeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>Connect Computer</span>
          </button>
        </div>
      </div>

      {/* Agents List */}
      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Checking paired agents status...</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl text-center space-y-5 border border-slate-200 bg-white shadow-sm max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
            <Monitor className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900">No Windows Counter Computers Connected</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Connect the Windows PC that is physically plugged into your counter printers. Print jobs sent by customers will be automatically spooled to your thermal, laser, or inkjet printers.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleGenerateCode}
              disabled={codeLoading}
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Connect First Counter PC</span>
            </button>
            <a
              href="/SecurePrint-Windows-Agent.zip"
              download="SecurePrint-Windows-Agent.zip"
              className="inline-flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Download Windows Agent</span>
            </a>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent: any) => {
            const isOnline = agent.status === 'ONLINE';

            return (
              <div
                key={agent.id}
                className="glass-card p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4 hover:border-slate-300 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                      <Monitor className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                        <span>{agent.machineName}</span>
                        {isOnline && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        v{agent.agentVersion} • Windows Spooler Engine
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center space-x-1.5 text-[10px] font-bold px-3 py-1 rounded-full border shadow-sm ${
                        isOnline
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-red-50 border-red-200 text-red-700'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-600' : 'bg-red-600'}`} />
                      <span>{agent.status}</span>
                    </span>
                    <button
                      onClick={() => handleDeleteAgent(agent.id, agent.machineName)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs font-semibold inline-flex items-center space-x-1"
                      title="Disconnect & Remove Agent"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-slate-500 font-medium">Synced Printers:</span>
                    <div className="font-bold text-slate-900 mt-1 flex items-center space-x-1.5">
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      <span>{agent.printers?.length || 0} local queues</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Last Active Pulse:</span>
                    <div className="font-semibold text-slate-800 mt-1">
                      {agent.lastHeartbeatAt
                        ? new Date(agent.lastHeartbeatAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })
                        : 'Never'}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Physical Spooling Active</span>
                  </div>
                  <Link
                    href="/admin/printers"
                    className="text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center space-x-1 text-[11px]"
                  >
                    <span>View Printers →</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Complete Step-by-Step Pairing Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => {
                setModalOpen(false);
                refetch();
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                <Monitor className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Connect Windows Counter PC
              </h2>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Follow these 4 simple steps to connect your counter computer and spool customer print jobs directly.
              </p>
            </div>

            {/* Step 1: Download / Location */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>Get the Windows Agent</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Windows 10/11 (64-bit)</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Download the lightweight SecurePrint native agent on the PC connected to your printers:
              </p>
              <a
                href="/SecurePrint-Windows-Agent.zip"
                download="SecurePrint-Windows-Agent.zip"
                className="inline-flex items-center justify-center space-x-2 w-full py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl font-bold text-xs shadow-sm transition-all"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Download SecurePrint-Windows-Agent.zip (~250 KB)</span>
              </a>
            </div>

            {/* Step 2: Open App */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">2</span>
                <span>Run Start-Agent.bat (or SecurePrint.Agent.exe)</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Extract the downloaded zip on your counter computer and double-click <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-800 font-semibold">Start-Agent.bat</code>. It will automatically connect to SecurePrint Cloud and detect your local printers.
              </p>
            </div>

            {/* Step 3: Enter Pairing Code */}
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 text-xs flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">3</span>
                  <span>Enter 6-Digit Pairing Code in Agent</span>
                </span>
                <span className="text-[10px] text-emerald-700 font-bold bg-white px-2 py-0.5 rounded border border-emerald-200 flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-emerald-600" />
                  <span>{formatTime(timeLeft)} remaining</span>
                </span>
              </div>

              {pairingStatus === 'WAITING' ? (
                <div className="flex items-center space-x-2">
                  <div className="flex-1 p-3 bg-white rounded-xl border border-emerald-300 text-center shadow-inner">
                    <span className="text-3xl font-mono font-black tracking-widest text-emerald-700">
                      {pairingCode}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    title="Copy code"
                    className="p-3 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 transition-colors shadow-sm"
                  >
                    {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              ) : pairingStatus === 'EXPIRED' ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center space-y-2">
                  <div className="text-xs font-bold text-red-700">This pairing code has expired.</div>
                  <button
                    onClick={handleGenerateCode}
                    disabled={codeLoading}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Generate New Code</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-emerald-100 border border-emerald-300 rounded-xl text-center space-y-1.5">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
                  <div className="text-sm font-extrabold text-emerald-900">
                    Computer Connected Successfully!
                  </div>
                  <div className="text-xs text-emerald-800">
                    Host: <strong>{connectedAgent?.machineName}</strong> ({connectedAgent?.printersCount || 0} printers synced)
                  </div>
                </div>
              )}
            </div>

            {/* Step 4: Live Detection / Progress Status */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              {pairingStatus === 'WAITING' ? (
                <div className="flex items-center space-x-3 text-slate-600">
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin flex-shrink-0" />
                  <span className="text-[11px] leading-tight">
                    <strong>Waiting for Windows Agent:</strong> As soon as you enter the 6 digits in the desktop app, this window will automatically confirm connection without refreshing.
                  </span>
                </div>
              ) : pairingStatus === 'CONNECTED' ? (
                <div className="flex items-center space-x-3 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-[11px]">
                    Automatic print dispatch is now active for this counter PC.
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-3 text-red-700">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-[11px]">
                    Pairing code timed out. Click &quot;Generate New Code&quot; to try again.
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setModalOpen(false);
                  refetch();
                }}
                className={`w-full py-3 rounded-xl text-xs font-bold shadow-md transition-all ${
                  pairingStatus === 'CONNECTED'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20'
                }`}
              >
                {pairingStatus === 'CONNECTED' ? 'Done — View Connected Computer' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
