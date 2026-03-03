'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { PokerVsComputer } from '@/games/poker/PokerVsComputer';

const OPPONENT_OPTIONS = [
  { count: 1, label: '1 Opponent', emoji: '🤖', description: 'Heads-up poker', style: 'border-green-300 bg-green-500 hover:bg-green-600' },
  { count: 2, label: '2 Opponents', emoji: '🤖🤖', description: '3-player table', style: 'border-amber-300 bg-amber-500 hover:bg-amber-600' },
  { count: 4, label: '4 Opponents', emoji: '🤖🤖🤖🤖', description: '5-player table', style: 'border-orange-400 bg-orange-500 hover:bg-orange-600' },
  { count: 8, label: '8 Opponents', emoji: '👥', description: 'Full table', style: 'border-red-500 bg-red-600 hover:bg-red-700' },
];

export default function PokerComputerPage() {
  const [numOpponents, setNumOpponents] = useState<number | null>(null);

  if (numOpponents === null) {
    return (
      <div className="mx-auto max-w-sm px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/games/poker">
            <Button variant="back">← Back</Button>
          </Link>
          <h1 className="text-2xl font-black text-slate-800">🃏 vs 🤖</h1>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-center text-sm font-semibold text-slate-500 mb-1">How many opponents?</p>
          {OPPONENT_OPTIONS.map(opt => (
            <button
              key={opt.count}
              onClick={() => setNumOpponents(opt.count)}
              className={`rounded-2xl border-2 px-6 py-4 text-left shadow transition active:scale-95 ${opt.style}`}
            >
              <p className="font-black text-white text-lg">{opt.emoji} {opt.label}</p>
              <p className="text-sm text-white/80">{opt.description}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => setNumOpponents(null)}
          className="rounded-xl border-2 border-slate-200 bg-white px-3 py-1.5 text-sm font-black text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95"
        >
          ← Back
        </button>
        <h1 className="text-xl font-black text-slate-800">
          🃏 vs {numOpponents} 🤖
        </h1>
      </div>
      <PokerVsComputer
        numOpponents={numOpponents}
        onChangeSettings={() => setNumOpponents(null)}
      />
    </div>
  );
}
