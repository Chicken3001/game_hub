'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  INITIAL_BOARD,
  getValidMoves,
  getImmediateJumps,
  getStepMoves,
  applyMove,
  checkWinner,
  boardKey,
  isPlayerPiece,
  isKing,
  rowCol,
} from './logic';
import type { CheckersGameRow, CellValue, GameStatus, PlayerNumber } from './types';

interface Props {
  initialGame: CheckersGameRow;
  currentUserId: string;
  roomId: string;
}

export function CheckersGame({ initialGame, currentUserId, roomId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [game, setGame] = useState(initialGame);
  const [joining, setJoining] = useState(false);
  const [opponentUsername, setOpponentUsername] = useState<string | null>(null);
  const [rematching, setRematching] = useState(false);
  const [opponentGone, setOpponentGone] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Multi-step move state (local only, never persisted mid-sequence)
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [pendingBoard, setPendingBoard] = useState<CellValue[] | null>(null);
  const [mustContinueFrom, setMustContinueFrom] = useState<number | null>(null);
  const [lastMove, setLastMove] = useState<{ from: number; to: number } | null>(null);
  const jumpOriginRef = useRef<number | null>(null);

  const DISCONNECT_TIMEOUT = 30;

  const myPlayer: PlayerNumber | null =
    game.player_1 === currentUserId ? 1
    : game.player_2 === currentUserId ? 2
    : null;
  const isMyTurn = game.status === 'active' && game.current_turn === myPlayer;
  const isSpectator = myPlayer === null;
  const opponentId =
    myPlayer === 1 ? game.player_2
    : myPlayer === 2 ? game.player_1
    : null;

  const gameOver = game.status === 'p1_wins' || game.status === 'p2_wins' || game.status === 'draw';
  const iWon =
    (game.status === 'p1_wins' && myPlayer === 1) ||
    (game.status === 'p2_wins' && myPlayer === 2);
  const opponentWon =
    (game.status === 'p1_wins' && myPlayer === 2) ||
    (game.status === 'p2_wins' && myPlayer === 1);

  // Fetch opponent username
  useEffect(() => {
    if (!opponentId) return;
    supabase
      .from('profiles')
      .select('username')
      .eq('id', opponentId)
      .single()
      .then(({ data }) => { if (data) setOpponentUsername(data.username); });
  }, [opponentId, supabase]);

  // Cancel waiting game on unmount (host only)
  useEffect(() => {
    if (initialGame.status !== 'waiting' || initialGame.player_1 !== currentUserId) return;
    return () => {
      supabase
        .from('checkers_games')
        .update({ status: 'cancelled' })
        .eq('id', roomId)
        .eq('status', 'waiting')
        .then(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Join on mount (second player)
  useEffect(() => {
    if (initialGame.status !== 'waiting') return;
    if (initialGame.player_1 === currentUserId) return;
    if (initialGame.player_2 !== null) return;

    setJoining(true);
    supabase
      .from('checkers_games')
      .update({ player_2: currentUserId, status: 'active' })
      .eq('id', roomId)
      .is('player_2', null)
      .select()
      .single()
      .then(({ data, error }) => {
        setJoining(false);
        if (error || !data) {
          supabase
            .from('checkers_games')
            .select('*')
            .eq('id', roomId)
            .single()
            .then(({ data: r }) => { if (r) setGame(r as CheckersGameRow); });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Presence — disconnect detection
  useEffect(() => {
    if (!myPlayer || game.status !== 'active') return;
    const channel = supabase
      .channel(`presence:checkers:${roomId}`)
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        if ((leftPresences as unknown as Array<{ userId: string }>).some(p => p.userId === opponentId)) {
          setOpponentGone(true);
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        if ((newPresences as unknown as Array<{ userId: string }>).some(p => p.userId === opponentId)) {
          setOpponentGone(false);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId: currentUserId });
        }
      });
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, myPlayer]);

  // Countdown when opponent disconnects
  useEffect(() => {
    if (!opponentGone) { setCountdown(null); return; }
    setCountdown(DISCONNECT_TIMEOUT);
    const id = setInterval(() => {
      setCountdown(n => (n !== null && n > 1 ? n - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [opponentGone]);

  // Cancel + redirect when countdown expires
  useEffect(() => {
    if (countdown !== 0) return;
    void (async () => {
      try {
        await supabase
          .from('checkers_games')
          .update({ status: 'cancelled' })
          .eq('id', roomId)
          .eq('status', 'active');
      } finally {
        router.push('/games/checkers');
      }
    })();
  }, [countdown, roomId, router, supabase]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`checkers:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'checkers_games', filter: `id=eq.${roomId}` },
        (payload) => {
          const newGame = payload.new as CheckersGameRow;
          const oldBoard = (payload.old as Partial<CheckersGameRow>).board;
          const boardChanged = oldBoard && JSON.stringify(oldBoard) !== JSON.stringify(newGame.board);
          if (boardChanged) {
            let moveFrom = -1, moveTo = -1;
            for (let i = 0; i < 64; i++) {
              if (oldBoard![i] === 0 && newGame.board[i] !== 0) moveTo = i;
            }
            if (moveTo !== -1) {
              const movedCell = newGame.board[moveTo];
              const movedOwner: PlayerNumber = movedCell === 1 || movedCell === 3 ? 1 : 2;
              for (let i = 0; i < 64; i++) {
                if (isPlayerPiece(oldBoard![i] as CellValue, movedOwner) && newGame.board[i] === 0) {
                  moveFrom = i; break;
                }
              }
            }
            if (moveFrom !== -1 && moveTo !== -1) setLastMove({ from: moveFrom, to: moveTo });
            setSelectedPiece(null);
            setPendingBoard(null);
            setMustContinueFrom(null);
          }
          setGame(newGame);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, supabase]);

  // ── Pieces that must move when a capture is mandatory ─────────────────────
  const forcedPieces = useMemo((): Set<number> => {
    if (!isMyTurn || gameOver || mustContinueFrom !== null || !game.forced_capture) return new Set();
    const activeBoard = pendingBoard ?? game.board;
    const validMoves = getValidMoves(activeBoard, myPlayer!, true);
    if (!validMoves.some(m => m.jumped.length > 0)) return new Set();
    return new Set(validMoves.map(m => m.from));
  }, [isMyTurn, gameOver, mustContinueFrom, game.forced_capture, pendingBoard, game.board, myPlayer]);

  // ── Valid destinations for highlighted cells ──────────────────────────────
  const validDestinations = useMemo((): Set<number> => {
    if (!isMyTurn || gameOver) return new Set();
    const activeBoard = pendingBoard ?? game.board;

    if (mustContinueFrom !== null) {
      return new Set(getImmediateJumps(activeBoard, mustContinueFrom, myPlayer!).map(j => j.to));
    }
    if (selectedPiece === null) return new Set();

    const validMoves = getValidMoves(activeBoard, myPlayer!, game.forced_capture);
    const hasJumps = validMoves.some(m => m.jumped.length > 0);

    if (game.forced_capture && hasJumps) {
      return new Set(getImmediateJumps(activeBoard, selectedPiece, myPlayer!).map(j => j.to));
    }
    return new Set([
      ...getImmediateJumps(activeBoard, selectedPiece, myPlayer!).map(j => j.to),
      ...getStepMoves(activeBoard, selectedPiece, myPlayer!),
    ]);
  }, [selectedPiece, mustContinueFrom, pendingBoard, game.board, game.forced_capture, isMyTurn, gameOver, myPlayer]);

  // ── Commit a completed move to DB ─────────────────────────────────────────
  const commitMove = useCallback(async (newBoard: CellValue[], from: number, to: number) => {
    setLastMove({ from, to });
    jumpOriginRef.current = null;
    setSelectedPiece(null);
    setPendingBoard(null);
    setMustContinueFrom(null);

    const next: PlayerNumber = myPlayer === 1 ? 2 : 1;
    const winner = checkWinner(newBoard, next);

    // Repetition draw: same position (board + whose turn) seen 3 times
    const key = boardKey(newBoard, next);
    const currentHistory = game.position_history ?? [];
    const newHistory = [...currentHistory, key];
    const repetitionCount = newHistory.filter(k => k === key).length;
    const isRepetitionDraw = repetitionCount >= 3;

    const newStatus: GameStatus =
      isRepetitionDraw ? 'draw'
      : winner === 1 ? 'p1_wins'
      : winner === 2 ? 'p2_wins'
      : 'active';

    setGame(g => ({
      ...g,
      board: newBoard,
      status: newStatus,
      current_turn: newStatus === 'active' ? next : g.current_turn,
      position_history: newHistory,
    }));

    const { error } = await supabase
      .from('checkers_games')
      .update({ board: newBoard, current_turn: next, status: newStatus, position_history: newHistory })
      .eq('id', roomId)
      .eq('current_turn', myPlayer!)
      .eq('status', 'active');

    if (error) {
      supabase
        .from('checkers_games')
        .select('*')
        .eq('id', roomId)
        .single()
        .then(({ data: r }) => { if (r) setGame(r as CheckersGameRow); });
    }
  }, [myPlayer, roomId, supabase, game.position_history]);

  // ── Click handler ─────────────────────────────────────────────────────────
  function handleCellClick(idx: number) {
    if (!isMyTurn || gameOver) return;
    const activeBoard = pendingBoard ?? game.board;

    // ── Locked into a multi-jump sequence ──
    if (mustContinueFrom !== null) {
      const continuationJumps = getImmediateJumps(activeBoard, mustContinueFrom, myPlayer!);
      const jump = continuationJumps.find(j => j.to === idx);
      if (!jump) return;

      const newBoard = activeBoard.slice() as CellValue[];
      newBoard[jump.to] = newBoard[mustContinueFrom];
      newBoard[mustContinueFrom] = 0;
      newBoard[jump.jumped] = 0;

      const [toRow] = rowCol(jump.to);
      const kinged =
        (myPlayer === 1 && toRow === 0 && newBoard[jump.to] === 1) ||
        (myPlayer === 2 && toRow === 7 && newBoard[jump.to] === 2);
      if (kinged) {
        newBoard[jump.to] = myPlayer === 1 ? 3 : 4;
        void commitMove(newBoard, jumpOriginRef.current ?? mustContinueFrom, jump.to);
        return;
      }

      const moreJumps = getImmediateJumps(newBoard, jump.to, myPlayer!);
      if (moreJumps.length > 0) {
        setSelectedPiece(jump.to);
        setPendingBoard(newBoard);
        setMustContinueFrom(jump.to);
      } else {
        void commitMove(newBoard, jumpOriginRef.current ?? mustContinueFrom, jump.to);
      }
      return;
    }

    // ── Normal: select a piece ──
    if (isPlayerPiece(activeBoard[idx], myPlayer!)) {
      if (game.forced_capture) {
        const validMoves = getValidMoves(activeBoard, myPlayer!, true);
        const hasJumps = validMoves.some(m => m.jumped.length > 0);
        if (hasJumps && getImmediateJumps(activeBoard, idx, myPlayer!).length === 0) return;
      }
      setSelectedPiece(idx);
      setPendingBoard(null);
      setMustContinueFrom(null);
      return;
    }

    if (selectedPiece === null) return;

    // ── Normal: try jump first, then step ──
    const jump = getImmediateJumps(activeBoard, selectedPiece, myPlayer!).find(j => j.to === idx);
    if (jump) {
      const newBoard = activeBoard.slice() as CellValue[];
      newBoard[jump.to] = newBoard[selectedPiece];
      newBoard[selectedPiece] = 0;
      newBoard[jump.jumped] = 0;

      const [toRow] = rowCol(jump.to);
      const kinged =
        (myPlayer === 1 && toRow === 0 && newBoard[jump.to] === 1) ||
        (myPlayer === 2 && toRow === 7 && newBoard[jump.to] === 2);
      if (kinged) {
        newBoard[jump.to] = myPlayer === 1 ? 3 : 4;
        void commitMove(newBoard, selectedPiece!, jump.to);
        return;
      }

      const moreJumps = getImmediateJumps(newBoard, jump.to, myPlayer!);
      if (moreJumps.length > 0) {
        jumpOriginRef.current = selectedPiece;
        setSelectedPiece(jump.to);
        setPendingBoard(newBoard);
        setMustContinueFrom(jump.to);
      } else {
        void commitMove(newBoard, selectedPiece!, jump.to);
      }
    } else if (validDestinations.has(idx)) {
      const newBoard = activeBoard.slice() as CellValue[];
      newBoard[idx] = newBoard[selectedPiece];
      newBoard[selectedPiece] = 0;
      const [toRow] = rowCol(idx);
      if (myPlayer === 1 && toRow === 0 && newBoard[idx] === 1) newBoard[idx] = 3;
      if (myPlayer === 2 && toRow === 7 && newBoard[idx] === 2) newBoard[idx] = 4;
      void commitMove(newBoard, selectedPiece!, idx);
    }
  }

  async function handleToggleForcedCapture() {
    if (game.status !== 'waiting' || myPlayer !== 1) return;
    const newVal = !game.forced_capture;
    setGame(g => ({ ...g, forced_capture: newVal }));
    await supabase
      .from('checkers_games')
      .update({ forced_capture: newVal })
      .eq('id', roomId)
      .eq('status', 'waiting');
  }

  async function handleRematch() {
    setRematching(true);
    try {
      await supabase
        .from('checkers_games')
        .update({ status: 'cancelled' })
        .eq('player_1', currentUserId)
        .eq('status', 'waiting');
      const { data } = await supabase
        .from('checkers_games')
        .insert({ player_1: currentUserId })
        .select()
        .single();
      if (data) router.push(`/games/checkers/${data.id}`);
      else router.push('/games/checkers');
    } finally {
      setRematching(false);
    }
  }

  if (game.status === 'cancelled') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="text-5xl">🚫</div>
        <p className="text-xl font-black text-slate-700">This game was cancelled</p>
        <button
          onClick={() => router.push('/games/checkers')}
          className="rounded-2xl border-2 border-rose-300 bg-rose-600 px-6 py-2 text-sm font-black text-white shadow transition hover:bg-rose-700 active:scale-95"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  const activeBoard = pendingBoard ?? game.board;

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Waiting state */}
      {game.status === 'waiting' && myPlayer === 1 && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50 px-8 py-8 shadow-md w-full max-w-sm">
          <div className="text-5xl animate-bounce">⏳</div>
          <p className="text-xl font-black text-rose-800">Waiting for opponent…</p>
          <p className="text-sm font-semibold text-rose-500">
            Your game is listed in the lobby — a friend can join from there.
          </p>
          <div className="flex items-center justify-between gap-4 pt-2 w-full">
            <div>
              <p className="text-sm font-black text-rose-700">Forced Capture</p>
              <p className="text-xs text-rose-400">Must jump an opponent&apos;s piece when possible</p>
            </div>
            <button
              onClick={handleToggleForcedCapture}
              aria-label={game.forced_capture ? 'Disable forced capture' : 'Enable forced capture'}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${game.forced_capture ? 'bg-green-500' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${game.forced_capture ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      )}

      {/* Joining spinner */}
      {game.status === 'waiting' && joining && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-rose-200 bg-rose-50 px-8 py-8">
          <div className="text-5xl animate-spin">🌀</div>
          <p className="text-xl font-black text-rose-800">Joining game…</p>
        </div>
      )}

      {/* Spectator view */}
      {isSpectator && game.status !== 'waiting' && !joining && (
        <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-amber-200 bg-amber-50 px-8 py-8 shadow-md">
          <div className="text-5xl">👀</div>
          <p className="text-xl font-black text-amber-800">This game is full</p>
          <p className="text-sm font-semibold text-amber-600">You are spectating</p>
        </div>
      )}

      {/* Disconnect warning */}
      {opponentGone && !gameOver && !isSpectator && countdown !== null && (
        <div className="flex flex-col items-center gap-2 rounded-3xl border-2 border-amber-300 bg-amber-50 px-6 py-5 text-center shadow-md w-full max-w-sm">
          <p className="text-lg font-black text-amber-800">⚠️ Opponent disconnected</p>
          <p className="text-sm font-semibold text-amber-600">
            Returning to lobby in {countdown}s…
          </p>
          <button
            onClick={() => router.push('/games/checkers')}
            className="mt-1 rounded-2xl border-2 border-amber-400 bg-amber-500 px-6 py-2 text-sm font-black text-white shadow transition hover:bg-amber-600 active:scale-95"
          >
            Return Now
          </button>
        </div>
      )}

      {/* Board */}
      {(game.status === 'active' || gameOver || isSpectator) && (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          {/* Status bar */}
          {!gameOver && game.status === 'active' && (
            <p className={`text-lg font-black ${isMyTurn ? 'text-rose-700' : 'text-slate-500'}`}>
              {isSpectator
                ? `Player ${game.current_turn}'s turn`
                : isMyTurn
                ? '🎯 Your turn!'
                : `⏳ ${opponentUsername ?? 'Opponent'}'s turn…`}
            </p>
          )}

          {mustContinueFrom !== null && (
            <p className="text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-300 rounded-xl px-3 py-1">
              Multi-jump! Keep capturing.
            </p>
          )}

          {/* Board grid */}
          <div className="rounded-2xl bg-amber-900 p-2 shadow-xl w-full">
            <div className="grid grid-cols-8 gap-0.5">
              {Array.from({ length: 64 }, (_, idx) => {
                const [row, col] = rowCol(idx);
                const dark = (row + col) % 2 === 1;
                const cell = activeBoard[idx];
                const isSelected = selectedPiece === idx || mustContinueFrom === idx;
                const isValidDest = validDestinations.has(idx);
                const isForcedPiece = !isSelected && forcedPieces.has(idx);
                const isMine = myPlayer !== null && isPlayerPiece(cell, myPlayer);
                const owner = cell === 0 ? null : (cell === 1 || cell === 3 ? 1 : 2);
                const king = isKing(cell);

                return (
                  <div
                    key={idx}
                    onClick={() => handleCellClick(idx)}
                    className={`
                      aspect-square flex items-center justify-center relative
                      ${!dark ? 'bg-amber-100' : isValidDest ? 'bg-amber-600 ring-2 ring-yellow-300 cursor-pointer' : lastMove?.from === idx ? 'bg-amber-700' : 'bg-amber-800'}
                      ${dark && isMine && isMyTurn && !mustContinueFrom ? 'cursor-pointer' : ''}
                      ${dark && mustContinueFrom === idx ? 'cursor-default' : ''}
                    `}
                  >
                    {/* Valid destination dot (no piece) */}
                    {dark && isValidDest && cell === 0 && (
                      <div className="w-2 h-2 rounded-full bg-yellow-300 opacity-80" />
                    )}

                    {/* Piece */}
                    {cell !== 0 && (
                      <div className={`
                        w-[82%] h-[82%] rounded-full flex items-center justify-center text-base font-black select-none
                        shadow-md transition-all duration-100
                        ${owner === 1
                          ? 'bg-rose-500 border-2 border-rose-700 text-yellow-300'
                          : 'bg-slate-800 border-2 border-slate-600 text-yellow-300'}
                        ${isSelected ? 'ring-4 ring-yellow-400' : isForcedPiece ? 'ring-4 ring-green-400' : lastMove?.to === idx ? 'ring-2 ring-white/80' : isValidDest ? 'ring-2 ring-yellow-300' : ''}
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
              mt-2 flex flex-col items-center gap-3 rounded-3xl border-2 px-8 py-6 shadow-md w-full
              ${game.status === 'draw' ? 'border-slate-300 bg-slate-50'
                : iWon ? 'border-green-300 bg-green-50'
                : opponentWon ? 'border-rose-300 bg-rose-50'
                : 'border-slate-300 bg-slate-50'}
            `}>
              <div className="text-4xl">
                {game.status === 'draw' ? '🤝' : iWon ? '🏆' : '😢'}
              </div>
              <p className={`text-xl font-black ${
                game.status === 'draw' ? 'text-slate-700'
                : iWon ? 'text-green-700'
                : opponentWon ? 'text-rose-700'
                : 'text-slate-700'
              }`}>
                {game.status === 'draw' ? "It's a draw!"
                  : iWon ? 'You win!'
                  : opponentWon ? 'You lost!'
                  : game.status === 'p1_wins' ? 'Red wins!'
                  : 'Black wins!'}
              </p>
              <div className="flex gap-2 flex-wrap justify-center">
                {!isSpectator && (
                  <button
                    onClick={handleRematch}
                    disabled={rematching}
                    className="rounded-2xl border-2 border-green-300 bg-green-500 px-5 py-2 text-sm font-black text-white shadow transition hover:bg-green-600 disabled:opacity-60 active:scale-95"
                  >
                    {rematching ? '⏳ Starting…' : '🔄 Rematch'}
                  </button>
                )}
                <button
                  onClick={() => router.push('/games/checkers')}
                  className="rounded-2xl border-2 border-rose-300 bg-rose-600 px-5 py-2 text-sm font-black text-white shadow transition hover:bg-rose-700 active:scale-95"
                >
                  Lobby
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Player indicator */}
      {myPlayer && game.status !== 'waiting' && (
        <p className="text-sm font-semibold text-slate-500">
          You (
          {myPlayer === 1
            ? <span className="font-black text-rose-500">🔴 Red</span>
            : <span className="font-black text-slate-800">⚫ Black</span>}
          )
          {opponentUsername && (
            <> vs <span className="font-black text-slate-700">{opponentUsername}</span></>
          )}
        </p>
      )}
    </div>
  );
}

// Re-export INITIAL_BOARD so the lobby can reference it if needed
export { INITIAL_BOARD };
