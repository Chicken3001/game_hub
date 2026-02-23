'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function GameError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="text-6xl">😵</div>
      <p className="text-xl font-black text-slate-700">Something went wrong</p>
      <p className="text-sm font-semibold text-slate-400 max-w-xs">
        {error.message || 'An unexpected error occurred loading this game.'}
      </p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={reset}
          className="rounded-2xl border-2 border-slate-300 bg-white px-5 py-2 text-sm font-black text-slate-700 shadow transition hover:bg-slate-50 active:scale-95"
        >
          Try again
        </button>
        <Link href="/hub">
          <Button size="sm">Back to Hub</Button>
        </Link>
      </div>
    </div>
  );
}
