'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { PokerVsComputer } from '@/games/poker/PokerVsComputer';
import { BLIND_SCHEDULE } from '@/games/poker/types';

const OPPONENT_OPTIONS = [
  { count: 1, label: '1 Opponent', emoji: '🤖', description: 'Heads-up poker', style: 'border-green-300 bg-green-500 hover:bg-green-600' },
  { count: 2, label: '2 Opponents', emoji: '🤖🤖', description: '3-player table', style: 'border-amber-300 bg-amber-500 hover:bg-amber-600' },
  { count: 4, label: '4 Opponents', emoji: '🤖🤖🤖🤖', description: '5-player table', style: 'border-orange-400 bg-orange-500 hover:bg-orange-600' },
  { count: 8, label: '8 Opponents', emoji: '👥', description: 'Full table', style: 'border-red-500 bg-red-600 hover:bg-red-700' },
];

const INTERVAL_OPTIONS = [
  { minutes: 5, label: '5 min' },
  { minutes: 10, label: '10 min' },
  { minutes: 15, label: '15 min' },
  { minutes: 20, label: '20 min' },
  { minutes: 30, label: '30 min' },
];

const ACTION_TIME_OPTIONS = [
  { seconds: 15, label: '15s' },
  { seconds: 30, label: '30s' },
  { seconds: 45, label: '45s' },
  { seconds: 60, label: '60s' },
  { seconds: 0, label: 'No Limit' },
];

const SHOWDOWN_TIME_OPTIONS = [
  { seconds: 5, label: '5s' },
  { seconds: 7, label: '7s' },
  { seconds: 10, label: '10s' },
  { seconds: 15, label: '15s' },
  { seconds: 0, label: 'Manual' },
];

interface GameSettings {
  numOpponents: number;
  startingBlindLevel: number;
  blindIntervalMinutes: number;
  actionTimeSeconds: number;
  showdownTimeSeconds: number;
}

export default function PokerComputerPage() {
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [numOpponents, setNumOpponents] = useState<number | null>(null);
  const [showBlindOptions, setShowBlindOptions] = useState(false);
  const [startingBlindLevel, setStartingBlindLevel] = useState(0);
  const [blindInterval, setBlindInterval] = useState(10);
  const [actionTime, setActionTime] = useState(30);
  const [showdownTime, setShowdownTime] = useState(7);

  if (settings !== null) {
    return (
      <div className="mx-auto max-w-sm px-4 py-6">
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => setSettings(null)}
            className="rounded-xl border-2 border-slate-200 bg-white px-3 py-1.5 text-sm font-black text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95"
          >
            ← Back
          </button>
          <h1 className="text-xl font-black text-slate-800">
            🃏 vs {settings.numOpponents} 🤖
          </h1>
        </div>
        <PokerVsComputer
          numOpponents={settings.numOpponents}
          startingBlindLevel={settings.startingBlindLevel}
          blindIntervalMinutes={settings.blindIntervalMinutes}
          actionTimeSeconds={settings.actionTimeSeconds}
          showdownTimeSeconds={settings.showdownTimeSeconds}
          onChangeSettings={() => setSettings(null)}
        />
      </div>
    );
  }

  // Step 2: configure blinds after choosing opponents
  if (numOpponents !== null) {
    const blinds = BLIND_SCHEDULE[startingBlindLevel];
    return (
      <div className="mx-auto max-w-sm px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => setNumOpponents(null)}
            className="rounded-xl border-2 border-slate-200 bg-white px-3 py-1.5 text-sm font-black text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-black text-slate-800">🃏 vs {numOpponents} 🤖</h1>
        </div>

        <div className="flex flex-col gap-4">
          {/* Blind options toggle */}
          <button
            onClick={() => setShowBlindOptions(!showBlindOptions)}
            className="rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:bg-slate-50 active:scale-95"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-slate-700">Blind Settings</p>
                <p className="text-xs text-slate-400">
                  Starting {blinds.small}/{blinds.big} — levels every {blindInterval}min — {actionTime > 0 ? `${actionTime}s to act` : 'no time limit'}
                </p>
              </div>
              <span className="text-slate-400 text-lg">{showBlindOptions ? '▲' : '▼'}</span>
            </div>
          </button>

          {showBlindOptions && (
            <div className="rounded-2xl border-2 border-slate-200 bg-white px-4 py-4 shadow-sm flex flex-col gap-4">
              {/* Starting blind level */}
              <div>
                <p className="text-xs font-black text-slate-500 mb-2">Starting Blinds</p>
                <div className="flex gap-2 flex-wrap">
                  {BLIND_SCHEDULE.map((bl, i) => (
                    <button
                      key={i}
                      onClick={() => setStartingBlindLevel(i)}
                      className={`rounded-lg border-2 px-3 py-1.5 text-xs font-black transition active:scale-95 ${
                        i === startingBlindLevel
                          ? 'border-amber-400 bg-amber-500 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {bl.small}/{bl.big}
                    </button>
                  ))}
                </div>
              </div>

              {/* Blind interval */}
              <div>
                <p className="text-xs font-black text-slate-500 mb-2">Time Between Levels</p>
                <div className="flex gap-2 flex-wrap">
                  {INTERVAL_OPTIONS.map(opt => (
                    <button
                      key={opt.minutes}
                      onClick={() => setBlindInterval(opt.minutes)}
                      className={`rounded-lg border-2 px-3 py-1.5 text-xs font-black transition active:scale-95 ${
                        opt.minutes === blindInterval
                          ? 'border-amber-400 bg-amber-500 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action timer */}
              <div>
                <p className="text-xs font-black text-slate-500 mb-2">Time to Act</p>
                <div className="flex gap-2 flex-wrap">
                  {ACTION_TIME_OPTIONS.map(opt => (
                    <button
                      key={opt.seconds}
                      onClick={() => setActionTime(opt.seconds)}
                      className={`rounded-lg border-2 px-3 py-1.5 text-xs font-black transition active:scale-95 ${
                        opt.seconds === actionTime
                          ? 'border-amber-400 bg-amber-500 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Showdown timer */}
              <div>
                <p className="text-xs font-black text-slate-500 mb-2">Showdown Delay</p>
                <div className="flex gap-2 flex-wrap">
                  {SHOWDOWN_TIME_OPTIONS.map(opt => (
                    <button
                      key={opt.seconds}
                      onClick={() => setShowdownTime(opt.seconds)}
                      className={`rounded-lg border-2 px-3 py-1.5 text-xs font-black transition active:scale-95 ${
                        opt.seconds === showdownTime
                          ? 'border-amber-400 bg-amber-500 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Start game button */}
          <button
            onClick={() => setSettings({ numOpponents, startingBlindLevel, blindIntervalMinutes: blindInterval, actionTimeSeconds: actionTime, showdownTimeSeconds: showdownTime })}
            className="rounded-2xl border-2 border-emerald-400 bg-emerald-600 px-6 py-4 font-black text-white text-lg shadow transition hover:bg-emerald-700 active:scale-95"
          >
            Start Game
          </button>
        </div>
      </div>
    );
  }

  // Step 1: choose opponents
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
