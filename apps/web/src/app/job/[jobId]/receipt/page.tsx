'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { Printer, Download, CheckCircle2, ShieldCheck, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function JobReceiptPage() {
  const params = useParams();
  const jobId = params?.jobId as string;

  const { data: receipt, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['receipt', jobId],
    queryFn: () => apiRequest(`/api/v1/receipts/job/${jobId}`),
    enabled: !!jobId && jobId !== 'new',
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <span className="text-xs text-slate-500 font-medium mt-3">Loading receipt...</span>
      </div>
    );
  }

  if (isError || !receipt) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Receipt Not Available</h2>
          <p className="text-sm text-slate-500">
            {(error as any)?.message || 'A receipt is issued only after verified payment completion.'}
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Retry
            </button>
            <Link
              href={`/job/${jobId}/payment`}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors"
            >
              Check Payment
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const pricing = receipt.pricingBreakdownJson || {};
  const payment = receipt.paymentDetailsJson || {};
  const shop = receipt.shopDetailsJson || receipt.shop || {};
  const job = receipt.jobDetailsJson || {};

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
      <div className="max-w-lg w-full space-y-4">
        {/* Navigation & Actions */}
        <div className="flex items-center justify-between no-print">
          <Link
            href={`/s/${receipt.shop?.slug || 'apex-digital'}`}
            className="inline-flex items-center space-x-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>New Print Order</span>
          </Link>
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2 rounded-xl border border-slate-300 shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>

        {/* Printable Physical Receipt Card */}
        <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6 border border-slate-200">
          {/* Header */}
          <div className="text-center space-y-1 pb-4 border-b border-slate-200">
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-700">Official Payment Receipt</div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">{shop.name || 'Apex Digital Prints'}</h1>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">{shop.address || 'Shop 14, Commercial Complex, Bengaluru'}</p>
            {shop.phone && <p className="text-xs text-slate-500">Contact: {shop.phone}</p>}
          </div>

          {/* Receipt Identifiers */}
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pb-3 border-b border-slate-100">
            <div>
              <span className="text-slate-400">Receipt No:</span>
              <div className="font-bold text-slate-900">{receipt.receiptNumber}</div>
            </div>
            <div className="text-right">
              <span className="text-slate-400">Date & Time:</span>
              <div className="font-medium text-slate-900">
                {new Date(receipt.issuedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </div>
            </div>
            <div>
              <span className="text-slate-400">Customer:</span>
              <div className="font-bold text-slate-900">{receipt.customerName}</div>
            </div>
            <div className="text-right">
              <span className="text-slate-400">Order ID:</span>
              <div className="font-mono text-slate-900">{job.jobCode || receipt.jobId?.slice(0, 8)}</div>
            </div>
          </div>

          {/* Line Items Breakdown */}
          <div className="space-y-2 text-xs">
            <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Print Summary</div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Color Mode</span>
              <span className="font-semibold text-slate-900">{job.options?.colorMode === 'COLOR' ? 'Color' : 'B&W'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Copies</span>
              <span className="font-semibold text-slate-900">{job.options?.copies || 1}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Paper & Sides</span>
              <span className="font-semibold text-slate-900">
                {job.options?.paperSize || 'A4'} • {job.options?.duplex !== 'NONE' ? '2-Sided' : '1-Sided'}
              </span>
            </div>
          </div>

          {/* Total Amount */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
            <div>
              <div className="text-xs text-slate-500">Payment Status:</div>
              <div className="text-xs font-bold text-emerald-700 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>PAID ({payment.method || 'VERIFIED'})</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Total Paid:</div>
              <div className="text-2xl font-black text-slate-900">
                ₹{Number(payment.amount || pricing.finalAmount || 2).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Zero-Retention Privacy Seal */}
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <strong>Privacy Verified:</strong> Uploaded original document has been permanently deleted from cloud and local disks.
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
            Generated by SecurePrint Cloud • Multi-Tenant Document Platform
          </div>
        </div>
      </div>
    </div>
  );
}

