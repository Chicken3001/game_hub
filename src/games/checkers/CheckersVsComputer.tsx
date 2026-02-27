'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  INITIAL_BOARD,
  getValidMoves,
  getImmediateJumps,
  getStepMoves,
  applyMove,
  checkWinner,
  isPlayerPiece,
  isKing,
  rowCol,
  ownerOf,
} from './logic';
import type { CellValue, PlayerNumber, CheckersMove } from './types';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'very-hard' | 'impossible';

const DEPTH: Record<Difficulty, number> = {
  easy: 1, medium: 2, hard: 3, 'very-hard': 4, impossible: 5,
};

// ── AI: heuristic ─────────────────────────────────────────────────────────────

function heuristic(board: CellValue[], ai: PlayerNumber): number {
  let score = 0;
  const human: PlayerNumber = ai === 1 ? 2 : 1;

  for (let i = 0; i < 64; i++) {
    const cell = board[i];
    if (cell === 0) continue;
    const owner = ownerOf(cell)!;
    const king = isKing(cell);
    const [row, col] = rowCol(i);
    const sign = owner === ai ? 1 : -1;

    // Base piece value
    score += sign * (king ? 3 : 1);

    // Advancement bonus for regular pieces
    if (!king) {
      const adv = owner === 1 ? (7 - row) : row;
      score += sign * adv * 0.05;
    }

    // Center column bonus
    const centerDist = Math.abs(col - 3.5);
    score += sign * (3.5 - centerDist) * 0.05;
  }

  // Mobility bonus
  const aiMoves = getValidMoves(board, ai).length;
  const humanMoves = getValidMoves(board, human).length;
  score += (aiMoves - humanMoves) * 0.1;

  return score;
}

// ── AI: minimax with alpha-beta ───────────────────────────────────────────────

function minimax(
  board: CellValue[],
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  ai: PlayerNumber
): number {
  const human: PlayerNumber = ai === 1 ? 2 : 1;
  const currentPlayer: PlayerNumber = maximizing ? ai : human;
  const moves = getValidMoves(board, currentPlayer);

  if (moves.length === 0) {
    return maximizing ? -(10000 + depth) : (10000 + depth);
  }
  if (depth === 0) return heuristic(board, ai);

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      best = Math.max(best, minimax(applyMove(board, move), depth - 1, alpha, beta, false, ai));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      best = Math.min(best, minimax(applyMove(board, move), depth - 1, alpha, beta, true, ai));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getBestMove(board: CellValue[], ai: PlayerNumber, depth: number): CheckersMove {
  const moves = getValidMoves(board, ai);
  let bestVal = -Infinity;
  let bestMove = moves[0];
  for (const move of moves) {
    const val = minimax(applyMove(board, move), depth - 1, -Infinity, Infinity, false, ai);
    if (val > bestVal) { bestVal = val; bestMove = move; }
  }
  return bestMove;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  difficulty: Difficulty;
  goFirst: boolean;       // true = human goes first (human=P1 Red, AI=P2 Black)
  onChangeSettings: () => void;
}

export function CheckersVsComputer({ difficulty, goFirst, onChangeSettings }: Props) {
  const router = useRouter();
  const humanPlayer: PlayerNumber = goFirst ? 1 : 2;
  const aiPlayer: PlayerNumber = goFirst ? 2 : 1;

  const [board, setBoard] = useState<CellValue[]>([...INITIAL_BOARD]);
  const [isComputerTurn, setIsComputerTurn] = useState(!goFirst);

  // Multi-step move state
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [pendingBoard, setPendingBoard] = useState<CellValue[] | null>(null);
  const [mustContinueFrom, setMustContinueFrom] = useState<number | null>(null);

  const winner = useMemo(() => {
    const current: PlayerNumber = isComputerTurn ? aiPlayer : humanPlayer;
    const next: PlayerNumber = current === 1 ? 2 : 1;
    // Check winner from perspective of the player who just moved
    // Actually: after a move we check if the NEXT player has no moves
    return null; // determined per-move; see gameOver
  }, []); // eslint-disable-line

  const [gameResult, setGameResult] = useState<PlayerNumber | 'draw' | null>(null);
  const gameOver = gameResult !== null;

  // AI turn
  useEffect(() => {
    if (!isComputerTurn || gameOver) return;
    const delay = difficulty === 'impossible' ? 600 : 400;
    const id = setTimeout(() => {
      const move = getBestMove(board, aiPlayer, DEPTH[difficulty]);
      const newBoard = applyMove(board, move);
      setBoard(newBoard);

      const w = checkWinner(newBoard, humanPlayer);
      if (w !== null) {
        setGameResult(w);
      } else {
        const humanMoves = getValidMoves(newBoard, humanPlayer);
        if (humanMoves.length === 0) setGameResult(aiPlayer);
        else setIsComputerTurn(false);
      }
    }, delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComputerTurn, gameOver, difficulty]);

  // Valid destinations for selected piece
  const validDestinations = useMemo((): Set<number> => {
    if (isComputerTurn || gameOver) return new Set();
    const activeBoard = pendingBoard ?? board;

    if (mustContinueFrom !== null) {
      return new Set(getImmediateJumps(activeBoard, mustContinueFrom, humanPlayer).map(j => j.to));
    }
    if (selectedPiece === null) return new Set();

    const validMoves = getValidMoves(activeBoard, humanPlayer);
    const hasJumps = validMoves.some(m => m.jumped.length > 0);
    if (hasJumps) {
      return new Set(getImmediateJumps(activeBoard, selectedPiece, humanPlayer).map(j => j.to));
    }
    return new Set(getStepMoves(activeBoard, selectedPiece, humanPlayer));
  }, [selectedPiece, mustContinueFrom, pendingBoard, board, isComputerTurn, gameOver, humanPlayer]);

  const commitMove = useCallback((newBoard: CellValue[]) => {
    setSelectedPiece(null);
    setPendingBoard(null);
    setMustContinueFrom(null);
    setBoard(newBoard);

    const w = checkWinner(newBoard, aiPlayer);
    if (w !== null) {
      setGameResult(w);
    } else {
      const aiMoves = getValidMoves(newBoard, aiPlayer);
      if (aiMoves.length === 0) setGameResult(humanPlayer);
      else setIsComputerTurn(true);
    }
  }, [aiPlayer, humanPlayer]);

  function handleCellClick(idx: number) {
    if (isComputerTurn || gameOver) return;
    const activeBoard = pendingBoard ?? board;

    // Locked into multi-jump
    if (mustContinueFrom !== null) {
      const continuationJumps = getImmediateJumps(activeBoard, mustContinueFrom, humanPlayer);
      const jump = continuationJumps.find(j => j.to === idx);
      if (!jump) return;

      const newBoard = activeBoard.slice() as CellValue[];
      newBoard[jump.to] = newBoard[mustContinueFrom];
      newBoard[mustContinueFrom] = 0;
      newBoard[jump.jumped] = 0;

      const [toRow] = rowCol(jump.to);
      const kinged =
        (humanPlayer === 1 && toRow === 0 && newBoard[jump.to] === 1) ||
        (humanPlayer === 2 && toRow === 7 && newBoard[jump.to] === 2);
      if (kinged) {
        newBoard[jump.to] = humanPlayer === 1 ? 3 : 4;
        commitMove(newBoard);
        return;
      }

      const moreJumps = getImmediateJumps(newBoard, jump.to, humanPlayer);
      if (moreJumps.length > 0) {
        setSelectedPiece(jump.to);
        setPendingBoard(newBoard);
        setMustContinueFrom(jump.to);
      } else {
        commitMove(newBoard);
      }
      return;
    }

    // Select a piece
    if (isPlayerPiece(activeBoard[idx], humanPlayer)) {
      const validMoves = getValidMoves(activeBoard, humanPlayer);
      const hasJumps = validMoves.some(m => m.jumped.length > 0);
      if (hasJumps && getImmediateJumps(activeBoard, idx, humanPlayer).length === 0) return;
      setSelectedPiece(idx);
      setPendingBoard(null);
      setMustContinueFrom(null);
      return;
    }

    if (selectedPiece === null) return;

    const validMoves = getValidMoves(activeBoard, humanPlayer);
    const hasJumps = validMoves.some(m => m.jumped.length > 0);

    if (hasJumps) {
      const jumps = getImmediateJumps(activeBoard, selectedPiece, humanPlayer);
      const jump = jumps.find(j => j.to === idx);
      if (!jump) return;

      const newBoard = activeBoard.slice() as CellValue[];
      newBoard[jump.to] = newBoard[selectedPiece];
      newBoard[selectedPiece] = 0;
      newBoard[jump.jumped] = 0;

      const [toRow] = rowCol(jump.to);
      const kinged =
        (humanPlayer === 1 && toRow === 0 && newBoard[jump.to] === 1) ||
        (humanPlayer === 2 && toRow === 7 && newBoard[jump.to] === 2);
      if (kinged) {
        newBoard[jump.to] = humanPlayer === 1 ? 3 : 4;
        commitMove(newBoard);
        return;
      }

      const moreJumps = getImmediateJumps(newBoard, jump.to, humanPlayer);
      if (moreJumps.length > 0) {
        setSelectedPiece(jump.to);
        setPendingBoard(newBoard);
        setMustContinueFrom(jump.to);
      } else {
        commitMove(newBoard);
      }
    } else {
      if (!validDestinations.has(idx)) return;
      const newBoard = activeBoard.slice() as CellValue[];
      newBoard[idx] = newBoard[selectedPiece];
      newBoard[selectedPiece] = 0;
      const [toRow] = rowCol(idx);
      if (humanPlayer === 1 && toRow === 0 && newBoard[idx] === 1) newBoard[idx] = 3;
      if (humanPlayer === 2 && toRow === 7 && newBoard[idx] === 2) newBoard[idx] = 4;
      commitMove(newBoard);
    }
  }

  function handleReplay() {
    setBoard([...INITIAL_BOARD]);
    setSelectedPiece(null);
    setPendingBoard(null);
    setMustContinueFrom(null);
    setGameResult(null);
    setIsComputerTurn(!goFirst);
  }

  const iWon = gameResult === humanPlayer;
  const activeBoard = pendingBoard ?? board;

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      {/* Status */}
      {!gameOver && (
        <p className={`text-lg font-black ${isComputerTurn ? 'text-slate-500' : 'text-rose-700'}`}>
          {isComputerTurn ? '🤖 Computer is thinking…' : '🎯 Your turn!'}
        </p>
      )}

      {mustContinueFrom !== null && !gameOver && (
        <p className="text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-300 rounded-xl px-3 py-1">
          Multi-jump! Keep capturing.
        </p>
      )}

      {/* Board */}
      <div className="rounded-2xl bg-amber-900 p-2 shadow-xl w-full max-w-sm">
        <div className="grid grid-cols-8 gap-0.5">
          {Array.from({ length: 64 }, (_, idx) => {
            const [row, col] = rowCol(idx);
            const dark = (row + col) % 2 === 1;
            const cell = activeBoard[idx];
            const isSelected = selectedPiece === idx || mustContinueFrom === idx;
            const isValidDest = validDestinations.has(idx);
            const isHuman = isPlayerPiece(cell, humanPlayer);
            const cellOwner = cell === 0 ? null : (cell === 1 || cell === 3 ? 1 : 2);
            const king = isKing(cell);

            return (
              <div
                key={idx}
                onClick={() => handleCellClick(idx)}
                className={`
                  aspect-square flex items-center justify-center relative
                  ${!dark ? 'bg-amber-100' : isValidDest ? 'bg-amber-600 ring-2 ring-yellow-300 cursor-pointer' : 'bg-amber-800'}
                  ${dark && isHuman && !isComputerTurn && !mustContinueFrom ? 'cursor-pointer' : ''}
                `}
              >
                {dark && isValidDest && cell === 0 && (
                  <div className="w-2 h-2 rounded-full bg-yellow-300 opacity-80" />
                )}
                {cell !== 0 && (
                  <div className={`
                    w-[82%] h-[82%] rounded-full flex items-center justify-center text-base font-black select-none
                    shadow-md transition-all duration-100
                    ${cellOwner === 1
                      ? 'bg-rose-500 border-2 border-rose-700 text-yellow-300'
                      : 'bg-slate-800 border-2 border-slate-600 text-yellow-300'}
                    ${isSelected ? 'ring-4 ring-yellow-400' : ''}
                    ${isValidDest ? 'ring-2 ring-yellow-300' : ''}
                  `}>
                    {king ? '♛' : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Game over */}
      {gameOver && (
        <div className={`
          flex flex-col items-center gap-3 rounded-3xl border-2 px-8 py-6 shadow-md w-full max-w-sm
          ${gameResult === 'draw' ? 'border-slate-300 bg-slate-50'
            : iWon ? 'border-green-300 bg-green-50'
            : 'border-rose-300 bg-rose-50'}
        `}>
          <div className="text-4xl">{gameResult === 'draw' ? '🤝' : iWon ? '🏆' : '🤖'}</div>
          <p className={`text-xl font-black ${
            gameResult === 'draw' ? 'text-slate-700' : iWon ? 'text-green-700' : 'text-rose-700'
          }`}>
            {gameResult === 'draw' ? "It's a draw!" : iWon ? 'You win!' : 'Computer wins!'}
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
              onClick={() => router.push('/games/checkers')}
              className="rounded-2xl border-2 border-rose-300 bg-rose-600 px-5 py-2 text-sm font-black text-white shadow transition hover:bg-rose-700 active:scale-95"
            >
              Lobby
            </button>
          </div>
        </div>
      )}

      {/* Indicator */}
      <p className="text-sm font-semibold text-slate-500">
        You (
        <span className={`font-black ${humanPlayer === 1 ? 'text-rose-500' : 'text-slate-800'}`}>
          {humanPlayer === 1 ? '🔴 Red' : '⚫ Black'}
        </span>
        ){' vs '}
        <span className="font-black text-slate-700">🤖 Computer</span>
        {' ('}
        <span className={`font-black ${aiPlayer === 1 ? 'text-rose-500' : 'text-slate-800'}`}>
          {aiPlayer === 1 ? '🔴 Red' : '⚫ Black'}
        </span>
        {')'}
      </p>
    </div>
  );
}
