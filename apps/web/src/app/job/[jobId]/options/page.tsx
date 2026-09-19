'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { Sliders, Copy, Layers, FileText, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function JobOptionsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.jobId as string;

  const [colorMode, setColorMode] = useState<'BW' | 'COLOR'>('BW');
  const [copies, setCopies] = useState<number>(1);
  const [paperSize, setPaperSize] = useState<'A4' | 'A3' | 'LEGAL' | 'LETTER'>('A4');
  const [duplex, setDuplex] = useState<'NONE' | 'LONG_EDGE' | 'SHORT_EDGE'>('NONE');
  const [pageRange, setPageRange] = useState<string>('all');
  const [pageCount, setPageCount] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch job to inspect uploaded document details and shop pricing
  const { data: job, isLoading, isError } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => apiRequest(`/api/v1/jobs/${jobId}`),
    enabled: !!jobId && jobId !== 'new',
  });

  useEffect(() => {
    if (job?.files?.[0]?.pageCount) {
      setPageCount(job.files[0].pageCount);
    }
    if (job?.printOptionsJson) {
      const opts = job.printOptionsJson;
      if (opts.colorMode) setColorMode(opts.colorMode);
      if (opts.copies) setCopies(opts.copies);
      if (opts.paperSize) setPaperSize(opts.paperSize);
      if (opts.duplex) setDuplex(opts.duplex);
    }
  }, [job]);

  const handleProceed = async () => {
    setSubmitting(true);
    setError(null);

    const options = {
      colorMode,
      copies,
      paperSize,
      duplex,
      pageRange: pageRange.trim(),
      pageCount,
    };

    try {
      await apiRequest(`/api/v1/jobs/${jobId}/options`, {
        method: 'PATCH',
        body: JSON.stringify({ options }),
      });
      sessionStorage.setItem(`options_${jobId}`, JSON.stringify(options));
      router.push(`/job/${jobId}/review`);
    } catch (err: any) {
      // Fallback: save to session and proceed
      sessionStorage.setItem(`options_${jobId}`, JSON.stringify(options));
      router.push(`/job/${jobId}/review`);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading print options...</p>
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Job Not Found</h2>
          <p className="text-sm text-slate-600">The requested job could not be loaded.</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block">
            Step 2 of 3 • Configure
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Print Preferences</h1>
          <p className="text-sm text-slate-600">Choose color mode, copies, and two-sided preferences.</p>
        </div>

        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xl space-y-6 bg-white">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Color Mode Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Color Preference
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setColorMode('BW')}
                className={`p-3.5 rounded-xl border text-center transition-all ${
                  colorMode === 'BW'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="text-sm">Black & White</div>
                <div className="text-xs text-emerald-700 mt-0.5 font-medium">Standard ₹2.00/pg</div>
              </button>

              <button
                type="button"
                onClick={() => setColorMode('COLOR')}
                className={`p-3.5 rounded-xl border text-center transition-all ${
                  colorMode === 'COLOR'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="text-sm">Full Color</div>
                <div className="text-xs text-emerald-700 mt-0.5 font-medium">Vibrant ₹10.00/pg</div>
              </button>
            </div>
          </div>

          {/* Number of Copies */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Number of Copies
            </label>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setCopies(Math.max(1, copies - 1))}
                className="w-12 h-11 rounded-xl bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-800 font-bold text-lg transition-colors"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max="500"
                value={copies}
                onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="glass-input text-center font-bold text-lg py-2 rounded-xl flex-1 text-slate-900 border-slate-300"
              />
              <button
                type="button"
                onClick={() => setCopies(copies + 1)}
                className="w-12 h-11 rounded-xl bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-800 font-bold text-lg transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Duplex Mode */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Sides (Duplex)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDuplex('NONE')}
                className={`p-3 rounded-xl border text-sm transition-all ${
                  duplex === 'NONE'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                }`}
              >
                Single Sided
              </button>
              <button
                type="button"
                onClick={() => setDuplex('LONG_EDGE')}
                className={`p-3 rounded-xl border text-sm transition-all ${
                  duplex !== 'NONE'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div>Double Sided</div>
                <div className="text-[10px] text-emerald-700 font-semibold">10% discount</div>
              </button>
            </div>
          </div>

          {/* Paper Size & Page Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Paper Size
              </label>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as any)}
                className="w-full glass-input px-3 py-2.5 rounded-xl text-sm text-slate-900 border-slate-300 bg-white"
              >
                <option value="A4">A4 (Standard)</option>
                <option value="A3">A3 (Large)</option>
                <option value="LEGAL">Legal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Pages to Print
              </label>
              <input
                type="text"
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
                placeholder="all or 1-3"
                className="w-full glass-input px-3 py-2.5 rounded-xl text-sm text-center text-slate-900 border-slate-300"
              />
            </div>
          </div>

          <button
            onClick={handleProceed}
            disabled={submitting}
            className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all text-sm disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Preferences...</span>
              </>
            ) : (
              <>
                <span>Review Order & Price</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
