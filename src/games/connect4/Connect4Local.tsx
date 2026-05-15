'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type CellValue = 0 | 1 | 2;

const ROWS = 6, COLS = 7;
const EMPTY_BOARD: CellValue[] = Array(42).fill(0);
const WIN_DIRS: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];

function dropRow(board: CellValue[], col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row * COLS + col] === 0) return row;
  }
  return -1;
}

function checkWinner(board: CellValue[]): 1 | 2 | 'draw' | null {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = board[r * COLS + c];
      if (!v) continue;
      for (const [dr, dc] of WIN_DIRS) {
        if ([1, 2, 3].every(i => {
          const nr = r + dr * i, nc = c + dc * i;
          return nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr * COLS + nc] === v;
        })) return v as 1 | 2;
      }
    }
  }
  return board.every(v => v !== 0) ? 'draw' : null;
}

export function Connect4Local() {
  const router = useRouter();
  const [board, setBoard] = useState<CellValue[]>([...EMPTY_BOARD]);
  const [turn, setTurn] = useState<1 | 2>(1);
  const [lastMove, setLastMove] = useState<number | null>(null);

  const winner = checkWinner(board);
  const gameOver = winner !== null;

  function handleColumnClick(col: number) {
    if (gameOver) return;
    const row = dropRow(board, col);
    if (row === -1) return;
    const next = board.slice() as CellValue[];
    next[row * COLS + col] = turn;
    setBoard(next);
    setLastMove(row * COLS + col);
    if (checkWinner(next) === null) setTurn(turn === 1 ? 2 : 1);
  }

  function handleReplay() {
    setBoard([...EMPTY_BOARD]);
    setLastMove(null);
    setTurn(1);
  }

  const turnColor = turn === 1 ? 'Red' : 'Yellow';

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      {/* Status */}
      {!gameOver && (
        <p className={`text-lg font-black ${turn === 1 ? 'text-rose-600' : 'text-yellow-600'}`}>
          {turn === 1 ? '🔴 Red' : '🟡 Yellow'}{`'s turn!`}
        </p>
      )}

      {/* Drop arrows */}
      {!gameOver && (
        <div className="grid grid-cols-7 gap-1.5 w-full max-w-sm px-1">
          {Array.from({ length: COLS }, (_, col) => (
            <div key={col} className="flex justify-center">
              {dropRow(board, col) !== -1 && (
                <span className={`text-lg font-black animate-bounce ${turn === 1 ? 'text-rose-400' : 'text-yellow-400'}`}>▼</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Board */}
      <div className="rounded-2xl bg-blue-600 p-2 shadow-xl w-full max-w-sm">
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: ROWS }, (_, row) =>
            Array.from({ length: COLS }, (_, col) => {
              const cell = board[row * COLS + col];
              const colFull = dropRow(board, col) === -1;
              return (
                <button
                  key={`${row}-${col}`}
                  onClick={() => handleColumnClick(col)}
                  disabled={gameOver || colFull}
                  className={`
                    aspect-square rounded-full shadow-inner transition-all duration-100
                    ${cell === 0 ? 'bg-slate-100' : cell === 1 ? 'bg-rose-500' : 'bg-yellow-400'}
                    ${cell === 0 && !colFull && !gameOver
                      ? 'cursor-pointer hover:opacity-80 active:scale-95'
                      : 'cursor-default'}
                    ${lastMove === row * COLS + col && cell !== 0 ? 'ring-2 ring-white/90' : ''}
                  `}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Game over */}
      {gameOver && (
        <div className={`
          flex flex-col items-center gap-3 rounded-3xl border-2 px-8 py-6 shadow-md w-full max-w-sm
          ${winner === 'draw' ? 'border-slate-300 bg-slate-50'
            : winner === 1 ? 'border-rose-300 bg-rose-50'
            : 'border-yellow-300 bg-yellow-50'}
        `}>
          <div className="text-4xl">{winner === 'draw' ? '🤝' : '🏆'}</div>
          <p className={`text-xl font-black ${
            winner === 'draw' ? 'text-slate-700'
            : winner === 1 ? 'text-rose-700'
            : 'text-yellow-700'
          }`}>
            {winner === 'draw' ? "It's a draw!" : `${winner === 1 ? '🔴 Red' : '🟡 Yellow'} wins!`}
          </p>
          <div className="flex gap-2 flex-wrap justify-center">
            <button
              onClick={handleReplay}
              className="rounded-2xl border-2 border-green-300 bg-green-500 px-5 py-2 text-sm font-black text-white shadow transition hover:bg-green-600 active:scale-95"
            >
              🔄 Play Again
            </button>
            <button
              onClick={() => router.push('/games/connect4')}
              className="rounded-2xl border-2 border-rose-300 bg-rose-600 px-5 py-2 text-sm font-black text-white shadow transition hover:bg-rose-700 active:scale-95"
            >
              Lobby
            </button>
          </div>
        </div>
      )}

      {/* Indicator */}
      <p className="text-sm font-semibold text-slate-500">
        <span className="font-black text-rose-500">🔴 Red</span>
        {' vs '}
        <span className="font-black text-yellow-500">🟡 Yellow</span>
        {' • Pass the device'} (next: <span className="font-black">{turnColor}</span>)
      </p>
    </div>
  );
}
