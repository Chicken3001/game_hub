'use client';

import { useState } from 'react';
import { BLIND_SCHEDULE } from '@/games/poker/types';

interface Props {
  level: number;
  intervalMinutes: number;
}

export function BlindLevelBadge({ level, intervalMinutes }: Props) {
  const [open, setOpen] = useState(false);
  const blinds = BLIND_SCHEDULE[Math.min(level, BLIND_SCHEDULE.length - 1)];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-700"
      >
        {blinds.small}/{blinds.big}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1.5 z-20">
            <div className="rounded-xl bg-slate-800 px-3 py-2 text-xs text-white shadow-lg w-48">
              <p className="font-black mb-1">Blind Schedule</p>
              <p className="text-white/70 mb-2">Increase every {intervalMinutes} min</p>
              <div className="flex flex-col gap-0.5">
                {BLIND_SCHEDULE.map((b, i) => (
                  <div
                    key={i}
                    className={`flex justify-between ${i === level ? 'text-amber-400 font-black' : 'text-white/60'}`}
                  >
                    <span>Lvl {i + 1}</span>
                    <span>{b.small}/{b.big}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
