'use client';

import React, { useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiRequest } from '@/lib/api-client';
import { Upload, FileCheck, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export default function JobUploadPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const sessionId = searchParams.get('sessionId');
  const shopSlug = searchParams.get('shopSlug');

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

      if (!validTypes.includes(selected.type)) {
        setError('Unsupported file type. Please upload a PDF or an image (PNG, JPG).');
        return;
      }

      if (selected.size > 50 * 1024 * 1024) {
        setError('File size exceeds the 50MB limit.');
        return;
      }

      setError(null);
      setFile(selected);
      // Default estimate page count (1 for images, estimated for PDF)
      setPageCount(1);
    }
  };

  const handleUploadAndProceed = async () => {
    if (!file) {
      setError('Please choose a file to upload.');
      return;
    }

    if (!sessionId) {
      setError('Session missing. Please start by scanning the shop QR code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);
      formData.append(
        'options',
        JSON.stringify({
          colorMode: 'BW',
          copies: 1,
          paperSize: 'A4',
          duplex: 'NONE',
          orientation: 'PORTRAIT',
        }),
      );
      formData.append('pageCount', pageCount.toString());

      const res = await apiRequest('/api/v1/jobs', {
        method: 'POST',
        body: formData,
      });

      // Save initial options in sessionStorage
      sessionStorage.setItem(
        `options_${res.id}`,
        JSON.stringify({
          colorMode: 'BW',
          copies: 1,
          paperSize: 'A4',
          duplex: 'NONE',
          orientation: 'PORTRAIT',
          pageCount,
        }),
      );

      router.push(`/job/${res.id}/options`);
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Step 1 of 3</div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Select Document</h1>
          <p className="text-sm text-slate-500">Upload the PDF or photo you want printed at the counter.</p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
              <div>{error}</div>
            </div>
          )}

          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              file
                ? 'border-emerald-500 bg-emerald-50/50'
                : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-slate-50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
            />

            {file ? (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center mx-auto">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 truncate max-w-[260px] mx-auto">
                    {file.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to configure
                  </div>
                </div>
                <div className="text-xs text-emerald-600 font-semibold underline">
                  Click to choose a different file
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center mx-auto shadow-sm">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">Tap to browse your device</div>
                  <div className="text-xs text-slate-500 mt-1">PDF, PNG, JPG up to 50MB</div>
                </div>
              </div>
            )}
          </div>

          {file && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700">
                Number of Pages in Document:
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={pageCount}
                  onChange={(e) => setPageCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm w-28 text-center font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-500">Total pages to calculate exact price</span>
              </div>
            </div>
          )}

          <button
            onClick={handleUploadAndProceed}
            disabled={!file || loading}
            className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-sm transition-all text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading Document to Private Storage...</span>
              </>
            ) : (
              <>
                <span>Configure Print Options</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

