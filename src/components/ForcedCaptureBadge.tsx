'use client';

import { useState } from 'react';

interface Props {
  on: boolean;
}

export function ForcedCaptureBadge({ on }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${on ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}
      >
        {on ? '🔒 On' : '🔓 Off'}
      </button>
      {open && (
        <>
          {/* Backdrop to close on tap-outside */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1.5 z-20">
            <div className="rounded-xl bg-slate-800 px-3 py-2 text-xs text-white shadow-lg whitespace-nowrap">
              <p className="font-black">{on ? 'Forced Capture: On' : 'Forced Capture: Off'}</p>
              <p className="text-white/70">{on ? 'You must jump when possible' : 'Jumping is optional'}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
