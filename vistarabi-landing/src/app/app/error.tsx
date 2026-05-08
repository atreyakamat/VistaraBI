'use client';
import { useEffect } from 'react';
import Link from 'next/link';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App scope error:', error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0f1420] text-slate-200">
      <div className="flex max-w-md flex-col items-center justify-center space-y-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500">
          <span className="material-symbols-outlined text-3xl">error</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Something went wrong!</h2>
        <p className="text-sm text-slate-400">
          We encountered an unexpected error while loading this page.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => reset()}
            className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/app"
            className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            Go back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
