'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';

interface Props {
  game: 'tic-tac-toe' | 'connect4';
}

export function RulesButton({ game }: Props) {
  const [open, setOpen] = useState(false);

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

      {game === 'tic-tac-toe' && (
        <Modal isOpen={open} onClose={() => setOpen(false)} title="❌ Tic-Tac-Toe Rules">
          <div className="flex flex-col gap-3 text-sm text-slate-700">
            <p>A two-player game played on a 3×3 grid.</p>
            <ol className="flex flex-col gap-2 list-decimal list-inside">
              <li>Players alternate placing their mark — X or O — in an empty square.</li>
              <li>Get <strong>3 marks in a row</strong> (horizontal, vertical, or diagonal) to win.</li>
              <li>If all 9 squares fill up with no winner, it&apos;s a <strong>draw</strong>.</li>
            </ol>
            <p className="text-xs text-slate-400">X always goes first.</p>
          </div>
        </Modal>
      )}

      {game === 'connect4' && (
        <Modal isOpen={open} onClose={() => setOpen(false)} title="🔴 Connect 4 Rules">
          <div className="flex flex-col gap-3 text-sm text-slate-700">
            <p>A two-player game on a 6-row × 7-column vertical grid.</p>
            <ol className="flex flex-col gap-2 list-decimal list-inside">
              <li>Take turns dropping a disc into a column — it falls to the lowest empty row.</li>
              <li>Get <strong>4 discs in a row</strong> (horizontal, vertical, or diagonal) to win.</li>
              <li>If the board fills with no winner, it&apos;s a <strong>draw</strong>.</li>
              <li>A full column can&apos;t be played — pick a different one.</li>
            </ol>
            <p className="text-xs text-slate-400">🔴 Red always goes first.</p>
          </div>
        </Modal>
      )}
    </>
  );
}
