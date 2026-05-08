'use client';
import { useEffect } from 'react';
import Link from 'next/link';

export default function DemoError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Demo scope error:', error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 text-slate-800">
      <div className="flex max-w-md flex-col items-center justify-center space-y-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-500">
          <span className="material-symbols-outlined text-3xl">error</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Something went wrong!</h2>
        <p className="text-sm text-slate-500">
          We encountered an unexpected error while loading the demo dashboard.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => reset()}
            className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/demo"
            className="rounded-lg border border-slate-200 bg-white px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Return to Demos
          </Link>
        </div>
      </div>
    </div>
  );
}
