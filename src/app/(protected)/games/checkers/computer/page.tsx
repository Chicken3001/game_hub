'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { CheckersVsComputer, type Difficulty } from '@/games/checkers/CheckersVsComputer';

const DIFFICULTIES: { value: Difficulty; label: string; emoji: string; description: string; style: string }[] = [
  {
    value: 'easy',
    label: 'Easy',
    emoji: '😊',
    description: 'Looks 1 move ahead',
    style: 'border-green-300 bg-green-500 hover:bg-green-600',
  },
  {
    value: 'medium',
    label: 'Medium',
    emoji: '🤔',
    description: 'Looks 2 moves ahead',
    style: 'border-amber-300 bg-amber-500 hover:bg-amber-600',
  },
  {
    value: 'hard',
    label: 'Hard',
    emoji: '🧠',
    description: 'Looks 3 moves ahead',
    style: 'border-orange-400 bg-orange-500 hover:bg-orange-600',
  },
  {
    value: 'very-hard',
    label: 'Very Hard',
    emoji: '🔥',
    description: 'Looks 4 moves ahead',
    style: 'border-red-500 bg-red-600 hover:bg-red-700',
  },
  {
    value: 'impossible',
    label: 'Impossible',
    emoji: '💀',
    description: 'Plays optimally — good luck',
    style: 'border-rose-500 bg-rose-700 hover:bg-rose-800',
  },
];

export default function CheckersComputerPage() {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [goFirst, setGoFirst] = useState<boolean | null>(null);
  const [forcedCapture, setForcedCapture] = useState(true);

  // ── Difficulty picker ──────────────────────────────────────────────────────
  if (!difficulty) {
    return (
      <div className="mx-auto max-w-sm px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/games/checkers">
            <Button variant="back">← Back</Button>
          </Link>
          <h1 className="text-2xl font-black text-slate-800">🔴 vs 🤖</h1>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-center text-sm font-semibold text-slate-500 mb-1">Choose a difficulty</p>
          {DIFFICULTIES.map(d => (
            <button
              key={d.value}
              onClick={() => setDifficulty(d.value)}
              className={`rounded-2xl border-2 px-6 py-4 text-left shadow transition active:scale-95 ${d.style}`}
            >
              <p className="font-black text-white text-lg">{d.emoji} {d.label}</p>
              <p className="text-sm text-white/80">{d.description}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Order picker ───────────────────────────────────────────────────────────
  if (goFirst === null) {
    return (
      <div className="mx-auto max-w-sm px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => setDifficulty(null)}
            className="rounded-xl border-2 border-slate-200 bg-white px-3 py-1.5 text-sm font-black text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-black text-slate-800">🔴 vs 🤖</h1>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-center text-sm font-semibold text-slate-500 mb-1">Who goes first?</p>
          <button
            onClick={() => setGoFirst(true)}
            className="rounded-2xl border-2 border-rose-400 bg-rose-600 px-6 py-4 text-left shadow transition hover:bg-rose-700 active:scale-95"
          >
            <p className="font-black text-white text-lg">🔴 You go first</p>
            <p className="text-sm text-rose-200">You play Red and move first</p>
          </button>
          <button
            onClick={() => setGoFirst(false)}
            className="rounded-2xl border-2 border-slate-300 bg-white px-6 py-4 text-left shadow transition hover:bg-slate-50 active:scale-95"
          >
            <p className="font-black text-slate-700 text-lg">🤖 Computer goes first</p>
            <p className="text-sm text-slate-400">You play Black and respond to the computer</p>
          </button>
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
        </div>
      </div>
    );
  }

  // ── Game ───────────────────────────────────────────────────────────────────
  const current = DIFFICULTIES.find(d => d.value === difficulty)!;

  return (
    <div className="mx-auto max-w-sm px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => setGoFirst(null)}
          className="rounded-xl border-2 border-slate-200 bg-white px-3 py-1.5 text-sm font-black text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95"
        >
          ← Back
        </button>
        <h1 className="text-xl font-black text-slate-800">
          🔴 vs 🤖 {current.emoji} {current.label}
        </h1>
        <div className="relative group">
          <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black cursor-default ${forcedCapture ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
            {forcedCapture ? '🔒 On' : '🔓 Off'}
          </div>
          <div className="absolute top-full left-0 mt-1.5 hidden group-hover:block z-10">
            <div className="rounded-xl bg-slate-800 px-3 py-2 text-xs text-white shadow-lg whitespace-nowrap">
              <p className="font-black">{forcedCapture ? 'Forced Capture: On' : 'Forced Capture: Off'}</p>
              <p className="text-white/70">{forcedCapture ? 'You must jump when possible' : 'Jumping is optional'}</p>
            </div>
          </div>
        </div>
      </div>
      <CheckersVsComputer
        difficulty={difficulty}
        goFirst={goFirst}
        forcedCapture={forcedCapture}
        onChangeSettings={() => setDifficulty(null)}
      />
    </div>
  );
}
