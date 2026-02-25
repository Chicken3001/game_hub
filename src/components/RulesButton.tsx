'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';

const RULES: Record<string, { title: string; content: React.ReactNode }> = {
  'tic-tac-toe': {
    title: '❌ Tic-Tac-Toe Rules',
    content: (
      <div className="flex flex-col gap-3 text-slate-700 text-sm">
        <p>Tic-Tac-Toe is a two-player game played on a 3×3 grid.</p>
        <ul className="flex flex-col gap-2 list-none">
          <li className="flex gap-2"><span className="text-indigo-500 font-black">1.</span> Players alternate turns placing their mark (X or O) in an empty square.</li>
          <li className="flex gap-2"><span className="text-indigo-500 font-black">2.</span> The first player to get <strong>3 marks in a row</strong> — horizontally, vertically, or diagonally — wins.</li>
          <li className="flex gap-2"><span className="text-indigo-500 font-black">3.</span> If all 9 squares are filled with no winner, the game is a <strong>draw</strong>.</li>
        </ul>
        <p className="text-xs text-slate-400 pt-1">X always goes first in the standard game.</p>
      </div>
    ),
  },
  'connect4': {
    title: '🔴 Connect 4 Rules',
    content: (
      <div className="flex flex-col gap-3 text-slate-700 text-sm">
        <p>Connect 4 is a two-player game on a 6-row × 7-column vertical grid.</p>
        <ul className="flex flex-col gap-2 list-none">
          <li className="flex gap-2"><span className="text-rose-500 font-black">1.</span> Players take turns dropping a disc into one of the 7 columns. The disc falls to the lowest empty row in that column.</li>
          <li className="flex gap-2"><span className="text-rose-500 font-black">2.</span> The first player to get <strong>4 discs in a row</strong> — horizontally, vertically, or diagonally — wins.</li>
          <li className="flex gap-2"><span className="text-rose-500 font-black">3.</span> If the board fills up with no winner, the game is a <strong>draw</strong>.</li>
          <li className="flex gap-2"><span className="text-rose-500 font-black">4.</span> A full column cannot be played — choose a different column.</li>
        </ul>
        <p className="text-xs text-slate-400 pt-1">🔴 Red always goes first.</p>
      </div>
    ),
  },
};

interface Props {
  game: 'tic-tac-toe' | 'connect4';
}

export function RulesButton({ game }: Props) {
  const [open, setOpen] = useState(false);
  const rules = RULES[game];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="How to play"
        className="flex items-center justify-center w-7 h-7 rounded-full border-2 border-slate-300 bg-white text-slate-500 text-sm font-black shadow-sm transition hover:bg-slate-50 hover:border-slate-400 hover:text-slate-700 active:scale-95"
        aria-label="How to play"
      >
        ?
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title={rules.title}>
        {rules.content}
      </Modal>
    </>
  );
}
