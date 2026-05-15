'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkWinner, createEmptyBoard } from './logic';
import type { CellValue, PlayerSymbol } from './types';

export function TicTacToeLocal() {
  const router = useRouter();
  const [board, setBoard] = useState<CellValue[]>(createEmptyBoard());
  const [turn, setTurn] = useState<PlayerSymbol>('X');
  const [lastMove, setLastMove] = useState<number | null>(null);

  const winner = checkWinner(board);
  const gameOver = winner !== null;

  function handleCellClick(i: number) {
    if (gameOver || board[i] !== '') return;
    const next = [...board] as CellValue[];
    next[i] = turn;
    setBoard(next);
    setLastMove(i);
    if (checkWinner(next) === null) {
      setTurn(turn === 'X' ? 'O' : 'X');
    }
  }

  function handleReplay() {
    setBoard(createEmptyBoard());
    setLastMove(null);
    setTurn('X');
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Status bar */}
      {!gameOver && (
        <p className={`text-lg font-black ${turn === 'X' ? 'text-indigo-700' : 'text-rose-600'}`}>
          {turn === 'X' ? '❌ X' : '⭕ O'}{`'s turn!`}
        </p>
      )}

      {/* Board */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => handleCellClick(i)}
            disabled={gameOver || cell !== ''}
            className={`
              aspect-square rounded-2xl border-2 text-5xl font-black shadow-sm
              transition-all duration-100
              ${cell === 'X' ? 'text-indigo-600' : 'text-rose-500'}
              ${cell === '' && !gameOver
                ? 'border-indigo-200 bg-white hover:bg-indigo-50 hover:border-indigo-400 cursor-pointer active:scale-95'
                : 'border-slate-200 bg-white/70 cursor-default'}
              ${lastMove === i && cell !== '' ? (cell === 'X' ? 'ring-2 ring-indigo-400 ring-offset-1' : 'ring-2 ring-rose-400 ring-offset-1') : ''}
              ${gameOver ? 'opacity-80' : ''}
            `}
          >
            {cell}
          </button>
        ))}
      </div>

      {/* Game over */}
      {gameOver && (
        <div className={`
          mt-2 flex flex-col items-center gap-3 rounded-3xl border-2 px-8 py-6 shadow-md w-full max-w-xs
          ${winner === 'draw' ? 'border-slate-300 bg-slate-50'
            : winner === 'X' ? 'border-indigo-300 bg-indigo-50'
            : 'border-rose-300 bg-rose-50'}
        `}>
          <div className="text-4xl">
            {winner === 'draw' ? '🤝' : '🏆'}
          </div>
          <p className={`text-xl font-black ${
            winner === 'draw' ? 'text-slate-700'
            : winner === 'X' ? 'text-indigo-700'
            : 'text-rose-700'
          }`}>
            {winner === 'draw' ? "It's a draw!" : `${winner === 'X' ? '❌ X' : '⭕ O'} wins!`}
          </p>
          <div className="flex gap-2 flex-wrap justify-center">
            <button
              onClick={handleReplay}
              className="rounded-2xl border-2 border-green-300 bg-green-500 px-5 py-2 text-sm font-black text-white shadow transition hover:bg-green-600 active:scale-95"
            >
              🔄 Play Again
            </button>
            <button
              onClick={() => router.push('/games/tic-tac-toe')}
              className="rounded-2xl border-2 border-indigo-300 bg-indigo-600 px-5 py-2 text-sm font-black text-white shadow transition hover:bg-indigo-700 active:scale-95"
            >
              Lobby
            </button>
          </div>
        </div>
      )}

      {/* Players indicator */}
      <p className="text-sm font-semibold text-slate-500">
        <span className="font-black text-indigo-600">❌ X</span>
        {' vs '}
        <span className="font-black text-rose-500">⭕ O</span>
        {' • Pass the device after each turn'}
      </p>
    </div>
  );
}
