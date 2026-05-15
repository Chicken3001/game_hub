'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  INITIAL_BOARD,
  getValidMoves,
  getImmediateJumps,
  getStepMoves,
  checkWinner,
  boardKey,
  isPlayerPiece,
  isKing,
  rowCol,
} from './logic';
import type { CellValue, PlayerNumber } from './types';

interface Props {
  forcedCapture: boolean;
  flipBetweenTurns: boolean;
  onChangeSettings: () => void;
}

export function CheckersOverTheBoard({ forcedCapture, flipBetweenTurns, onChangeSettings }: Props) {
  const router = useRouter();

  const [board, setBoard] = useState<CellValue[]>([...INITIAL_BOARD]);
  const [turn, setTurn] = useState<PlayerNumber>(1);
  const forcedCaptureRef = useRef(forcedCapture);
  forcedCaptureRef.current = forcedCapture;

  const positionHistoryRef = useRef<string[]>([boardKey([...INITIAL_BOARD], 1)]);

  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [pendingBoard, setPendingBoard] = useState<CellValue[] | null>(null);
  const [mustContinueFrom, setMustContinueFrom] = useState<number | null>(null);
  const [lastMove, setLastMove] = useState<{ from: number; to: number } | null>(null);
  const jumpOriginRef = useRef<number | null>(null);

  const [gameResult, setGameResult] = useState<PlayerNumber | 'draw' | null>(null);
  const gameOver = gameResult !== null;

  const forcedPieces = useMemo((): Set<number> => {
    if (gameOver || mustContinueFrom !== null || !forcedCapture) return new Set();
    const activeBoard = pendingBoard ?? board;
    const validMoves = getValidMoves(activeBoard, turn, true);
    if (!validMoves.some(m => m.jumped.length > 0)) return new Set();
    return new Set(validMoves.map(m => m.from));
  }, [gameOver, mustContinueFrom, forcedCapture, pendingBoard, board, turn]);

  const validDestinations = useMemo((): Set<number> => {
    if (gameOver) return new Set();
    const activeBoard = pendingBoard ?? board;

    if (mustContinueFrom !== null) {
      return new Set(getImmediateJumps(activeBoard, mustContinueFrom, turn).map(j => j.to));
    }
    if (selectedPiece === null) return new Set();

    const validMoves = getValidMoves(activeBoard, turn, forcedCapture);
    const hasJumps = validMoves.some(m => m.jumped.length > 0);
    if (forcedCapture && hasJumps) {
      return new Set(getImmediateJumps(activeBoard, selectedPiece, turn).map(j => j.to));
    }
    return new Set([
      ...getImmediateJumps(activeBoard, selectedPiece, turn).map(j => j.to),
      ...getStepMoves(activeBoard, selectedPiece, turn),
    ]);
  }, [selectedPiece, mustContinueFrom, pendingBoard, board, gameOver, turn, forcedCapture]);

  const commitMove = useCallback((newBoard: CellValue[], from: number, to: number) => {
    setLastMove({ from, to });
    jumpOriginRef.current = null;
    setSelectedPiece(null);
    setPendingBoard(null);
    setMustContinueFrom(null);
    setBoard(newBoard);

    const nextTurn: PlayerNumber = turn === 1 ? 2 : 1;
    const w = checkWinner(newBoard, nextTurn);
    if (w !== null) {
      setGameResult(w);
      return;
    }
    const key = boardKey(newBoard, nextTurn);
    positionHistoryRef.current.push(key);
    const hist = positionHistoryRef.current;
    const p1Recent = hist.filter(k => k.endsWith('1')).slice(-3);
    const p2Recent = hist.filter(k => k.endsWith('2')).slice(-3);
    if (p1Recent.length === 3 && p1Recent.every(k => k === p1Recent[0]) &&
        p2Recent.length === 3 && p2Recent.every(k => k === p2Recent[0])) {
      setGameResult('draw');
      return;
    }
    setTurn(nextTurn);
  }, [turn]);

  function handleCellClick(idx: number) {
    if (gameOver) return;
    const activeBoard = pendingBoard ?? board;

    if (mustContinueFrom !== null) {
      const continuationJumps = getImmediateJumps(activeBoard, mustContinueFrom, turn);
      const jump = continuationJumps.find(j => j.to === idx);
      if (!jump) return;

      const newBoard = activeBoard.slice() as CellValue[];
      newBoard[jump.to] = newBoard[mustContinueFrom];
      newBoard[mustContinueFrom] = 0;
      newBoard[jump.jumped] = 0;

      const [toRow] = rowCol(jump.to);
      const kinged =
        (turn === 1 && toRow === 0 && newBoard[jump.to] === 1) ||
        (turn === 2 && toRow === 7 && newBoard[jump.to] === 2);
      if (kinged) {
        newBoard[jump.to] = turn === 1 ? 3 : 4;
        commitMove(newBoard, jumpOriginRef.current ?? mustContinueFrom, jump.to);
        return;
      }

      const moreJumps = getImmediateJumps(newBoard, jump.to, turn);
      if (moreJumps.length > 0) {
        setSelectedPiece(jump.to);
        setPendingBoard(newBoard);
        setMustContinueFrom(jump.to);
      } else {
        commitMove(newBoard, jumpOriginRef.current ?? mustContinueFrom, jump.to);
      }
      return;
    }

    if (isPlayerPiece(activeBoard[idx], turn)) {
      if (forcedCapture) {
        const validMoves = getValidMoves(activeBoard, turn, true);
        const hasJumps = validMoves.some(m => m.jumped.length > 0);
        if (hasJumps && getImmediateJumps(activeBoard, idx, turn).length === 0) return;
      }
      setSelectedPiece(idx);
      setPendingBoard(null);
      setMustContinueFrom(null);
      return;
    }

    if (selectedPiece === null) return;

    const jump = getImmediateJumps(activeBoard, selectedPiece, turn).find(j => j.to === idx);
    if (jump) {
      const newBoard = activeBoard.slice() as CellValue[];
      newBoard[jump.to] = newBoard[selectedPiece];
      newBoard[selectedPiece] = 0;
      newBoard[jump.jumped] = 0;

      const [toRow] = rowCol(jump.to);
      const kinged =
        (turn === 1 && toRow === 0 && newBoard[jump.to] === 1) ||
        (turn === 2 && toRow === 7 && newBoard[jump.to] === 2);
      if (kinged) {
        newBoard[jump.to] = turn === 1 ? 3 : 4;
        commitMove(newBoard, selectedPiece, jump.to);
        return;
      }

      const moreJumps = getImmediateJumps(newBoard, jump.to, turn);
      if (moreJumps.length > 0) {
        jumpOriginRef.current = selectedPiece;
        setSelectedPiece(jump.to);
        setPendingBoard(newBoard);
        setMustContinueFrom(jump.to);
      } else {
        commitMove(newBoard, selectedPiece, jump.to);
      }
    } else if (validDestinations.has(idx)) {
      const newBoard = activeBoard.slice() as CellValue[];
      newBoard[idx] = newBoard[selectedPiece];
      newBoard[selectedPiece] = 0;
      const [toRow] = rowCol(idx);
      if (turn === 1 && toRow === 0 && newBoard[idx] === 1) newBoard[idx] = 3;
      if (turn === 2 && toRow === 7 && newBoard[idx] === 2) newBoard[idx] = 4;
      commitMove(newBoard, selectedPiece, idx);
    }
  }

  function handleReplay() {
    setBoard([...INITIAL_BOARD]);
    setTurn(1);
    setSelectedPiece(null);
    setPendingBoard(null);
    setMustContinueFrom(null);
    setLastMove(null);
    jumpOriginRef.current = null;
    positionHistoryRef.current = [boardKey([...INITIAL_BOARD], 1)];
    setGameResult(null);
  }

  const activeBoard = pendingBoard ?? board;
  const flipBoard = flipBetweenTurns && turn === 2;

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      {/* Status */}
      {!gameOver && (
        <p className={`text-lg font-black ${turn === 1 ? 'text-rose-600' : 'text-slate-800'}`}>
          {turn === 1 ? '🔴 Red' : '⚫ Black'}{`'s turn!`}
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
          {Array.from({ length: 64 }, (_, visualIdx) => {
            const boardIdx = flipBoard ? 63 - visualIdx : visualIdx;
            const [row, col] = rowCol(boardIdx);
            const dark = (row + col) % 2 === 1;
            const cell = activeBoard[boardIdx];
            const isSelected = selectedPiece === boardIdx || mustContinueFrom === boardIdx;
            const isValidDest = validDestinations.has(boardIdx);
            const isForcedPiece = !isSelected && forcedPieces.has(boardIdx);
            const isMine = isPlayerPiece(cell, turn);
            const cellOwner = cell === 0 ? null : (cell === 1 || cell === 3 ? 1 : 2);
            const king = isKing(cell);

            return (
              <div
                key={visualIdx}
                onClick={() => handleCellClick(boardIdx)}
                className={`
                  aspect-square flex items-center justify-center relative
                  ${!dark ? 'bg-amber-100' : isValidDest ? 'bg-amber-600 ring-2 ring-yellow-300 cursor-pointer' : lastMove?.from === boardIdx ? 'bg-amber-700' : 'bg-amber-800'}
                  ${dark && isMine && !mustContinueFrom ? 'cursor-pointer' : ''}
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
                    ${isSelected ? 'ring-4 ring-yellow-400' : isForcedPiece ? 'ring-4 ring-green-400' : lastMove?.to === boardIdx ? 'ring-2 ring-white/80' : isValidDest ? 'ring-2 ring-yellow-300' : ''}
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
            : gameResult === 1 ? 'border-rose-300 bg-rose-50'
            : 'border-slate-400 bg-slate-100'}
        `}>
          <div className="text-4xl">{gameResult === 'draw' ? '🤝' : '🏆'}</div>
          <p className={`text-xl font-black ${
            gameResult === 'draw' ? 'text-slate-700'
            : gameResult === 1 ? 'text-rose-700'
            : 'text-slate-800'
          }`}>
            {gameResult === 'draw' ? "It's a draw!" : `${gameResult === 1 ? '🔴 Red' : '⚫ Black'} wins!`}
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
        <span className="font-black text-rose-500">🔴 Red</span>
        {' vs '}
        <span className="font-black text-slate-800">⚫ Black</span>
        {flipBetweenTurns ? ' • Board flips each turn' : ' • Over the board'}
      </p>
    </div>
  );
}
