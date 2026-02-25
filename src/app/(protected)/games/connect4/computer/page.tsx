'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Connect4VsComputer, type Difficulty } from '@/games/connect4/Connect4VsComputer';

const DIFFICULTIES: { value: Difficulty; label: string; emoji: string; description: string; style: string }[] = [
  {
    value: 'easy',
    label: 'Easy',
    emoji: '😊',
    description: 'Computer plays randomly',
    style: 'border-green-300 bg-green-500 hover:bg-green-600',
  },
  {
    value: 'medium',
    label: 'Medium',
    emoji: '🤔',
    description: 'Alternates between smart and random moves',
    style: 'border-amber-300 bg-amber-500 hover:bg-amber-600',
  },
  {
    value: 'hard',
    label: 'Hard',
    emoji: '🧠',
    description: 'Computer plays optimally',
    style: 'border-rose-400 bg-rose-600 hover:bg-rose-700',
  },
];

export default function Connect4ComputerPage() {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);

  if (!difficulty) {
    return (
      <div className="mx-auto max-w-sm px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/games/connect4">
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

  const current = DIFFICULTIES.find(d => d.value === difficulty)!;

  return (
    <div className="mx-auto max-w-sm px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => setDifficulty(null)}
          className="rounded-xl border-2 border-slate-200 bg-white px-3 py-1.5 text-sm font-black text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95"
        >
          ← Back
        </button>
        <h1 className="text-xl font-black text-slate-800">
          🔴 vs 🤖 {current.emoji} {current.label}
        </h1>
      </div>
      <Connect4VsComputer
        difficulty={difficulty}
        onChangeDifficulty={() => setDifficulty(null)}
      />
    </div>
  );
}
