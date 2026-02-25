'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export type Difficulty = 'easy' | 'medium' | 'hard';

type CellValue = 0 | 1 | 2;

const ROWS = 6, COLS = 7;
const EMPTY_BOARD: CellValue[] = Array(42).fill(0);

// ── Pure board helpers ────────────────────────────────────────────────────────

function dropRow(board: CellValue[], col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row * COLS + col] === 0) return row;
  }
  return -1;
}

// Center-first ordering dramatically improves alpha-beta pruning
function validCols(board: CellValue[]): number[] {
  return [3, 2, 4, 1, 5, 0, 6].filter(c => board[c] === 0);
}

const WIN_DIRS: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];

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

// ── Heuristic evaluation (parameterised by AI player number) ──────────────────

function scoreWindow(w: CellValue[], ai: 1 | 2): number {
  const opp: 1 | 2 = ai === 1 ? 2 : 1;
  const p = w.filter(v => v === ai).length;
  const o = w.filter(v => v === opp).length;
  const e = w.filter(v => v === 0).length;
  if (o > 0 && p > 0) return 0;
  if (p === 4) return 100;
  if (p === 3 && e === 1) return 5;
  if (p === 2 && e === 2) return 2;
  if (o === 3 && e === 1) return -4;
  return 0;
}

function heuristic(board: CellValue[], ai: 1 | 2): number {
  let s = 0;
  for (let r = 0; r < ROWS; r++) if (board[r * COLS + 3] === ai) s += 3;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      s += scoreWindow([0, 1, 2, 3].map(i => board[r * COLS + c + i]) as CellValue[], ai);
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r <= ROWS - 4; r++)
      s += scoreWindow([0, 1, 2, 3].map(i => board[(r + i) * COLS + c]) as CellValue[], ai);
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 0; c <= COLS - 4; c++)
      s += scoreWindow([0, 1, 2, 3].map(i => board[(r + i) * COLS + c + i]) as CellValue[], ai);
  for (let r = 3; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      s += scoreWindow([0, 1, 2, 3].map(i => board[(r - i) * COLS + c + i]) as CellValue[], ai);
  return s;
}

// ── Minimax with alpha-beta (parameterised by AI player number) ───────────────

function minimax(board: CellValue[], depth: number, alpha: number, beta: number, maximizing: boolean, ai: 1 | 2): number {
  const human: 1 | 2 = ai === 1 ? 2 : 1;
  const w = checkWinner(board);
  if (w === ai) return 1000 + depth;
  if (w === human) return -1000 - depth;
  if (w === 'draw') return 0;
  if (depth === 0) return heuristic(board, ai) - heuristic(board, human);

  const cols = validCols(board);
  if (maximizing) {
    let best = -Infinity;
    for (const col of cols) {
      const next = board.slice() as CellValue[];
      next[dropRow(next, col) * COLS + col] = ai;
      best = Math.max(best, minimax(next, depth - 1, alpha, beta, false, ai));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const col of cols) {
      const next = board.slice() as CellValue[];
      next[dropRow(next, col) * COLS + col] = human;
      best = Math.min(best, minimax(next, depth - 1, alpha, beta, true, ai));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getBestMove(board: CellValue[], ai: 1 | 2): number {
  const cols = validCols(board);
  let bestVal = -Infinity, bestCol = cols[0];
  for (const col of cols) {
    const next = board.slice() as CellValue[];
    next[dropRow(next, col) * COLS + col] = ai;
    const val = minimax(next, 5, -Infinity, Infinity, false, ai);
    if (val > bestVal) { bestVal = val; bestCol = col; }
  }
  return bestCol;
}

function getRandomMove(board: CellValue[]): number {
  const cols = validCols(board);
  return cols[Math.floor(Math.random() * cols.length)];
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  difficulty: Difficulty;
  goFirst: boolean;
  onChangeSettings: () => void;
}

export function Connect4VsComputer({ difficulty, goFirst, onChangeSettings }: Props) {
  const router = useRouter();
  const [board, setBoard] = useState<CellValue[]>([...EMPTY_BOARD]);
  const [isComputerTurn, setIsComputerTurn] = useState(!goFirst);
  const computerMoves = useRef(0);

  // goFirst=true  → human=1 (Red),    AI=2 (Yellow)
  // goFirst=false → human=2 (Yellow),  AI=1 (Red)
  const humanPlayer: 1 | 2 = goFirst ? 1 : 2;
  const aiPlayer: 1 | 2 = goFirst ? 2 : 1;

  const winner = checkWinner(board);
  const gameOver = winner !== null;

  useEffect(() => {
    if (!isComputerTurn || gameOver) return;
    const delay = difficulty === 'hard' ? 600 : 400;
    const id = setTimeout(() => {
      setBoard(prev => {
        const next = prev.slice() as CellValue[];
        let col: number;
        if (difficulty === 'easy') {
          col = getRandomMove(next);
        } else if (difficulty === 'medium') {
          col = computerMoves.current % 2 === 0 ? getRandomMove(next) : getBestMove(next, aiPlayer);
        } else {
          col = getBestMove(next, aiPlayer);
        }
        next[dropRow(next, col) * COLS + col] = aiPlayer;
        return next;
      });
      computerMoves.current += 1;
      setIsComputerTurn(false);
    }, delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComputerTurn, gameOver, difficulty]); // aiPlayer/humanPlayer are stable per game instance

  function handleColumnClick(col: number) {
    if (isComputerTurn || gameOver) return;
    const row = dropRow(board, col);
    if (row === -1) return;
    const next = board.slice() as CellValue[];
    next[row * COLS + col] = humanPlayer;
    setBoard(next);
    if (checkWinner(next) === null) setIsComputerTurn(true);
  }

  function handleReplay() {
    setBoard([...EMPTY_BOARD]);
    setIsComputerTurn(!goFirst);
    computerMoves.current = 0;
  }

  const iWon = winner === humanPlayer;
  const humanColor = humanPlayer === 1 ? 'Red' : 'Yellow';
  const aiColor = aiPlayer === 1 ? 'Red' : 'Yellow';

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      {/* Status */}
      {!gameOver && (
        <p className={`text-lg font-black ${isComputerTurn ? 'text-slate-500' : 'text-rose-700'}`}>
          {isComputerTurn ? '🤖 Computer is thinking…' : '🎯 Your turn!'}
        </p>
      )}

      {/* Drop arrows */}
      {!isComputerTurn && !gameOver && (
        <div className="grid grid-cols-7 gap-1.5 w-full max-w-sm px-1">
          {Array.from({ length: COLS }, (_, col) => (
            <div key={col} className="flex justify-center">
              {dropRow(board, col) !== -1 && (
                <span className="text-rose-400 text-lg font-black animate-bounce">▼</span>
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
                  disabled={isComputerTurn || gameOver || colFull}
                  className={`
                    aspect-square rounded-full shadow-inner transition-all duration-100
                    ${cell === 0 ? 'bg-slate-100' : cell === 1 ? 'bg-rose-500' : 'bg-yellow-400'}
                    ${!isComputerTurn && cell === 0 && !colFull && !gameOver
                      ? 'cursor-pointer hover:opacity-80 active:scale-95'
                      : 'cursor-default'}
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
            : iWon ? 'border-green-300 bg-green-50'
            : 'border-rose-300 bg-rose-50'}
        `}>
          <div className="text-4xl">{winner === 'draw' ? '🤝' : iWon ? '🏆' : '🤖'}</div>
          <p className={`text-xl font-black ${
            winner === 'draw' ? 'text-slate-700' : iWon ? 'text-green-700' : 'text-rose-700'
          }`}>
            {winner === 'draw' ? "It's a draw!" : iWon ? 'You win!' : 'Computer wins!'}
          </p>
          <div className="flex gap-2 flex-wrap justify-center">
            <button
              onClick={handleReplay}
              className="rounded-2xl border-2 border-green-300 bg-green-500 px-5 py-2 text-sm font-black text-white shadow transition hover:bg-green-600 active:scale-95"
            >
              🔄 Play Again
            </button>
            <button
              onClick={onChangeSettings}
              className="rounded-2xl border-2 border-slate-300 bg-white px-5 py-2 text-sm font-black text-slate-700 shadow transition hover:bg-slate-50 active:scale-95"
            >
              Change Settings
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
        You (<span className={`font-black ${humanColor === 'Red' ? 'text-rose-500' : 'text-yellow-500'}`}>
          {humanColor === 'Red' ? '🔴 Red' : '🟡 Yellow'}
        </span>)
        {' vs '}
        <span className="font-black text-slate-700">🤖 Computer</span>
        {' ('}
        <span className={`font-black ${aiColor === 'Red' ? 'text-rose-500' : 'text-yellow-500'}`}>
          {aiColor === 'Red' ? '🔴 Red' : '🟡 Yellow'}
        </span>
        {')'}
      </p>
    </div>
  );
}
