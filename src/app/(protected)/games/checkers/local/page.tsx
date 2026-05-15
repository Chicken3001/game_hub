'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ForcedCaptureBadge } from '@/components/ForcedCaptureBadge';
import { CheckersOverTheBoard } from '@/games/checkers/CheckersOverTheBoard';

export default function CheckersLocalPage() {
  const [started, setStarted] = useState(false);
  const [forcedCapture, setForcedCapture] = useState(true);
  const [flipBetweenTurns, setFlipBetweenTurns] = useState(false);

  if (!started) {
    return (
      <div className="mx-auto max-w-sm px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/games/checkers">
            <Button variant="back">← Back</Button>
          </Link>
          <h1 className="text-2xl font-black text-slate-800">🔴 Over the Board ⚫</h1>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-center text-sm font-semibold text-slate-500 mb-1">
            Two players, one device — Red moves first
          </p>

          <div className="flex items-center justify-between rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 shadow">
            <div>
              <p className="font-black text-slate-700">Forced Capture</p>
              <p className="text-sm text-slate-400">Must jump an opponent&apos;s piece when possible</p>
            </div>
            <button
              onClick={() => setForcedCapture(v => !v)}
              aria-label={forcedCapture ? 'Disable forced capture' : 'Enable forced capture'}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${forcedCapture ? 'bg-green-500' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${forcedCapture ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 shadow">
            <div>
              <p className="font-black text-slate-700">Flip board between turns</p>
              <p className="text-sm text-slate-400">For passing the device — each player sees their pieces at the bottom</p>
            </div>
            <button
              onClick={() => setFlipBetweenTurns(v => !v)}
              aria-label={flipBetweenTurns ? 'Disable flipping' : 'Enable flipping'}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${flipBetweenTurns ? 'bg-green-500' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${flipBetweenTurns ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <button
            onClick={() => setStarted(true)}
            className="mt-2 rounded-2xl border-2 border-rose-400 bg-rose-600 px-6 py-3 font-black text-white shadow transition hover:bg-rose-700 active:scale-95"
          >
            ▶️ Start Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => setStarted(false)}
          className="rounded-xl border-2 border-slate-200 bg-white px-3 py-1.5 text-sm font-black text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95"
        >
          ← Back
        </button>
        <h1 className="text-xl font-black text-slate-800">🔴 Over the Board ⚫</h1>
        <ForcedCaptureBadge on={forcedCapture} />
      </div>
      <CheckersOverTheBoard
        forcedCapture={forcedCapture}
        flipBetweenTurns={flipBetweenTurns}
        onChangeSettings={() => setStarted(false)}
      />
    </div>
  );
}
