'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type CellValue = 'X' | 'O' | '';

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(b: CellValue[]): 'X' | 'O' | 'draw' | null {
  for (const [a, x, c] of WIN_LINES) {
    if (b[a] && b[a] === b[x] && b[a] === b[c]) return b[a] as 'X' | 'O';
  }
  return b.every(v => v !== '') ? 'draw' : null;
}

function minimax(board: CellValue[], isMaximizing: boolean): number {
  const result = checkWinner(board);
  if (result === 'O') return 10;
  if (result === 'X') return -10;
  if (result === 'draw') return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === '') {
        board[i] = 'O';
        best = Math.max(best, minimax(board, false));
        board[i] = '';
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === '') {
        board[i] = 'X';
        best = Math.min(best, minimax(board, true));
        board[i] = '';
      }
    }
    return best;
  }
}

function getBestMove(board: CellValue[]): number {
  let bestVal = -Infinity;
  let bestMove = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i] === '') {
      board[i] = 'O';
      const val = minimax(board, false);
      board[i] = '';
      if (val > bestVal) {
        bestVal = val;
        bestMove = i;
      }
    }
  }
  return bestMove;
}

const EMPTY_BOARD: CellValue[] = Array(9).fill('');

export function TicTacToeVsComputer() {
  const router = useRouter();
  const [board, setBoard] = useState<CellValue[]>([...EMPTY_BOARD]);
  const [isComputerTurn, setIsComputerTurn] = useState(false);

  const winner = checkWinner(board);
  const gameOver = winner !== null;

  // Computer plays after a short delay so it feels natural
  useEffect(() => {
    if (!isComputerTurn || gameOver) return;
    const id = setTimeout(() => {
      setBoard(prev => {
        const next = [...prev];
        const move = getBestMove(next);
        if (move === -1) return prev;
        next[move] = 'O';
        return next;
      });
      setIsComputerTurn(false);
    }, 400);
    return () => clearTimeout(id);
  }, [isComputerTurn, gameOver]);

  function handleCellClick(i: number) {
    if (isComputerTurn || gameOver || board[i] !== '') return;
    const next = [...board] as CellValue[];
    next[i] = 'X';
    setBoard(next);
    if (checkWinner(next) === null) setIsComputerTurn(true);
  }

  function handleReplay() {
    setBoard([...EMPTY_BOARD]);
    setIsComputerTurn(false);
  }

  const iWon = winner === 'X';

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Status bar */}
      {!gameOver && (
        <p className={`text-lg font-black ${isComputerTurn ? 'text-slate-500' : 'text-indigo-700'}`}>
          {isComputerTurn ? '🤖 Computer is thinking…' : '🎯 Your turn!'}
        </p>
      )}

      {/* Board */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => handleCellClick(i)}
            disabled={isComputerTurn || gameOver || cell !== ''}
            className={`
              aspect-square rounded-2xl border-2 text-5xl font-black shadow-sm
              transition-all duration-100
              ${cell === 'X' ? 'text-indigo-600' : 'text-rose-500'}
              ${cell === '' && !isComputerTurn && !gameOver
                ? 'border-indigo-200 bg-white hover:bg-indigo-50 hover:border-indigo-400 cursor-pointer active:scale-95'
                : 'border-slate-200 bg-white/70 cursor-default'}
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
            : iWon ? 'border-green-300 bg-green-50'
            : 'border-rose-300 bg-rose-50'}
        `}>
          <div className="text-4xl">
            {winner === 'draw' ? '🤝' : iWon ? '🏆' : '🤖'}
          </div>
          <p className={`text-xl font-black ${
            winner === 'draw' ? 'text-slate-700'
            : iWon ? 'text-green-700'
            : 'text-rose-700'
          }`}>
            {winner === 'draw' ? "It's a draw!" : iWon ? 'You win!' : 'Computer wins!'}
          </p>
          <div className="flex gap-2">
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

      {/* Symbol indicator */}
      <p className="text-sm font-semibold text-slate-500">
        You (<span className="font-black text-indigo-600">❌ X</span>)
        {' vs '}
        <span className="font-black text-slate-700">🤖 Computer</span>
        {' ('}
        <span className="font-black text-rose-500">⭕ O</span>
        {')'}
      </p>
    </div>
  );
}
