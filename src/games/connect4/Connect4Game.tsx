'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Connect4GameRow, CellValue, GameStatus, PlayerNumber } from './types';

const ROWS = 6, COLS = 7;

function dropRow(board: CellValue[], col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row * COLS + col] === 0) return row;
  }
  return -1;
}

const WIN_DIRS: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];

function checkWinner(board: CellValue[]): PlayerNumber | 'draw' | null {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = board[r * COLS + c];
      if (!v) continue;
      for (const [dr, dc] of WIN_DIRS) {
        if ([1, 2, 3].every(i => {
          const nr = r + dr * i, nc = c + dc * i;
          return nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr * COLS + nc] === v;
        })) return v as PlayerNumber;
      }
    }
  }
  return board.every(v => v !== 0) ? 'draw' : null;
}

interface Props {
  initialGame: Connect4GameRow;
  currentUserId: string;
  roomId: string;
}

export function Connect4Game({ initialGame, currentUserId, roomId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [game, setGame] = useState(initialGame);
  const [joining, setJoining] = useState(false);
  const [opponentUsername, setOpponentUsername] = useState<string | null>(null);
  const [opponentGone, setOpponentGone] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
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

  // Effect: fetch opponent username when opponentId becomes known
  useEffect(() => {
    if (!opponentId) return;
    supabase
      .from('profiles')
      .select('username')
      .eq('id', opponentId)
      .single()
      .then(({ data }) => {
        if (data) setOpponentUsername(data.username);
      });
  }, [opponentId, supabase]);

  // Effect: cancel waiting game when host navigates away
  useEffect(() => {
    if (initialGame.status !== 'waiting' || initialGame.player_1 !== currentUserId) return;
    return () => {
      supabase
        .from('connect4_games')
        .update({ status: 'cancelled' })
        .eq('id', roomId)
        .eq('status', 'waiting')
        .then(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentional: captures initialGame snapshot

  // Effect: join on mount
  useEffect(() => {
    if (initialGame.status !== 'waiting') return;
    if (initialGame.player_1 === currentUserId) return;
    if (initialGame.player_2 !== null) return;

    setJoining(true);
    supabase
      .from('connect4_games')
      .update({ player_2: currentUserId, status: 'active' })
      .eq('id', roomId)
      .is('player_2', null)
      .select()
      .single()
      .then(({ data, error }) => {
        setJoining(false);
        if (error || !data) {
          supabase
            .from('connect4_games')
            .select('*')
            .eq('id', roomId)
            .single()
            .then(({ data: r }) => {
              if (r) setGame(r as Connect4GameRow);
            });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentional: run once on mount using initialGame snapshot

  // Effect: presence — detect when opponent disconnects/reconnects
  useEffect(() => {
    if (!myPlayer || game.status !== 'active') return;
    const channel = supabase
      .channel(`presence:c4:${roomId}`)
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        if ((leftPresences as Array<{ userId: string }>).some(p => p.userId === opponentId)) {
          setOpponentGone(true);
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        if ((newPresences as Array<{ userId: string }>).some(p => p.userId === opponentId)) {
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
  }, [game.status, myPlayer]); // stable after game goes active; intentional snapshot of opponentId/currentUserId

  // Effect: start/stop countdown when opponentGone changes
  useEffect(() => {
    if (!opponentGone) {
      setCountdown(null);
      return;
    }
    setCountdown(DISCONNECT_TIMEOUT);
    const id = setInterval(() => {
      setCountdown(n => (n !== null && n > 1 ? n - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [opponentGone]);

  // Effect: redirect when countdown expires
  useEffect(() => {
    if (countdown === 0) router.push('/games/connect4');
  }, [countdown, router]);

  // Effect: realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`c4:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'connect4_games',
          filter: `id=eq.${roomId}`,
        },
        (payload) => setGame(payload.new as Connect4GameRow)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, supabase]);

  async function handleColumnClick(col: number) {
    const row = dropRow(game.board, col);
    if (row === -1 || !isMyTurn || game.status !== 'active') return;

    const newBoard = [...game.board] as CellValue[];
    newBoard[row * COLS + col] = myPlayer!;
    const winner = checkWinner(newBoard);
    const newStatus: GameStatus =
      winner === 1 ? 'p1_wins'
      : winner === 2 ? 'p2_wins'
      : winner === 'draw' ? 'draw'
      : 'active';

    setGame(g => ({
      ...g,
      board: newBoard,
      status: newStatus,
      current_turn: newStatus === 'active' ? (myPlayer === 1 ? 2 : 1) : g.current_turn,
    }));

    await supabase
      .from('connect4_games')
      .update({
        board: newBoard,
        current_turn: myPlayer === 1 ? 2 : 1,
        status: newStatus,
      })
      .eq('id', roomId)
      .eq('current_turn', myPlayer!)
      .eq('status', 'active');
  }

  if (game.status === 'cancelled') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="text-5xl">🚫</div>
        <p className="text-xl font-black text-slate-700">This game was cancelled</p>
        <button
          onClick={() => router.push('/games/connect4')}
          className="rounded-2xl border-2 border-rose-300 bg-rose-600 px-6 py-2 text-sm font-black text-white shadow transition hover:bg-rose-700 active:scale-95"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  const gameOver = game.status === 'p1_wins' || game.status === 'p2_wins' || game.status === 'draw';
  const iWon =
    (game.status === 'p1_wins' && myPlayer === 1) ||
    (game.status === 'p2_wins' && myPlayer === 2);
  const opponentWon =
    (game.status === 'p1_wins' && myPlayer === 2) ||
    (game.status === 'p2_wins' && myPlayer === 1);

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Waiting state */}
      {game.status === 'waiting' && myPlayer === 1 && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50 px-8 py-8 shadow-md">
          <div className="text-5xl animate-bounce">⏳</div>
          <p className="text-xl font-black text-rose-800">Waiting for opponent…</p>
          <p className="text-sm font-semibold text-rose-500">
            Your game is listed in the lobby — a friend can join from there.
          </p>
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

      {/* Opponent disconnect warning */}
      {opponentGone && !gameOver && !isSpectator && countdown !== null && (
        <div className="flex flex-col items-center gap-2 rounded-3xl border-2 border-amber-300 bg-amber-50 px-6 py-5 text-center shadow-md w-full max-w-sm">
          <p className="text-lg font-black text-amber-800">⚠️ Opponent disconnected</p>
          <p className="text-sm font-semibold text-amber-600">
            Returning to lobby in {countdown}s…
          </p>
          <button
            onClick={() => router.push('/games/connect4')}
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

          {/* Drop arrows */}
          {isMyTurn && !gameOver && (
            <div className="grid grid-cols-7 gap-1.5 w-full px-1">
              {Array.from({ length: COLS }, (_, col) => {
                const colFull = dropRow(game.board, col) === -1;
                return (
                  <div key={col} className="flex justify-center">
                    {!colFull && (
                      <span className="text-rose-400 text-lg font-black animate-bounce">▼</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Board grid */}
          <div className="rounded-2xl bg-blue-600 p-2 shadow-xl w-full">
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: ROWS }, (_, row) =>
                Array.from({ length: COLS }, (_, col) => {
                  const cell = game.board[row * COLS + col];
                  const colFull = dropRow(game.board, col) === -1;
                  return (
                    <button
                      key={`${row}-${col}`}
                      onClick={() => handleColumnClick(col)}
                      disabled={!isMyTurn || colFull || game.status !== 'active'}
                      className={`
                        aspect-square rounded-full shadow-inner transition-all duration-100
                        ${cell === 0 ? 'bg-slate-100' : cell === 1 ? 'bg-rose-500' : 'bg-yellow-400'}
                        ${isMyTurn && cell === 0 && !colFull && game.status === 'active'
                          ? 'cursor-pointer hover:opacity-80 active:scale-95'
                          : 'cursor-default'}
                      `}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Game over overlay */}
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
                  : 'Yellow wins!'}
              </p>
              <button
                onClick={() => router.push('/games/connect4')}
                className="rounded-2xl border-2 border-rose-300 bg-rose-600 px-6 py-2 text-sm font-black text-white shadow transition hover:bg-rose-700 active:scale-95"
              >
                Back to Lobby
              </button>
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
            : <span className="font-black text-yellow-500">🟡 Yellow</span>}
          )
          {opponentUsername && <> vs <span className="font-black text-slate-700">{opponentUsername}</span></>}
        </p>
      )}
    </div>
  );
}
