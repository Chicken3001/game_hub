'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { TicTacToeGameRow, CellValue, GameStatus, PlayerSymbol } from './types';
import { checkWinner } from './logic';

interface Props {
  initialGame: TicTacToeGameRow;
  currentUserId: string;
  roomId: string;
}

export function TicTacToeGame({ initialGame, currentUserId, roomId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [game, setGame] = useState(initialGame);
  const [joining, setJoining] = useState(false);
  const [opponentUsername, setOpponentUsername] = useState<string | null>(null);
  const [rematching, setRematching] = useState(false);
  const [opponentGone, setOpponentGone] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [lastMove, setLastMove] = useState<number | null>(null);
  const DISCONNECT_TIMEOUT = 30;

  const mySymbol: PlayerSymbol | null =
    game.player_x === currentUserId ? 'X'
    : game.player_o === currentUserId ? 'O'
    : null;
  const isMyTurn = game.status === 'active' && game.current_turn === mySymbol;
  const isSpectator = mySymbol === null;

  const opponentId =
    mySymbol === 'X' ? game.player_o
    : mySymbol === 'O' ? game.player_x
    : null;

  // Fetch opponent's username whenever their ID becomes known
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

  // Effect 1 — cancel waiting game when host navigates away
  useEffect(() => {
    if (initialGame.status !== 'waiting' || initialGame.player_x !== currentUserId) return;
    return () => {
      supabase
        .from('tic_tac_toe_games')
        .update({ status: 'cancelled' })
        .eq('id', roomId)
        .eq('status', 'waiting')
        .then(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentional: captures initialGame snapshot

  // Effect 2 — join on mount
  useEffect(() => {
    if (initialGame.status !== 'waiting') return;
    if (initialGame.player_x === currentUserId) return;
    if (initialGame.player_o !== null) return;

    setJoining(true);
    supabase
      .from('tic_tac_toe_games')
      .update({ player_o: currentUserId, status: 'active' })
      .eq('id', roomId)
      .is('player_o', null)
      .select()
      .single()
      .then(({ data, error }) => {
        setJoining(false);
        if (error || !data) {
          // Race lost — re-fetch authoritative state
          supabase
            .from('tic_tac_toe_games')
            .select('*')
            .eq('id', roomId)
            .single()
            .then(({ data: r }) => {
              if (r) setGame(r as TicTacToeGameRow);
            });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentional: run once on mount using initialGame snapshot

  // Effect 3 — presence: detect when opponent disconnects/reconnects
  useEffect(() => {
    if (!mySymbol || game.status !== 'active') return;
    const channel = supabase
      .channel(`presence:ttt:${roomId}`)
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
  }, [game.status, mySymbol]); // stable after game goes active; intentional snapshot of opponentId/currentUserId

  // Effect 4 — start/stop countdown when opponentGone changes
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

  // Effect 5 — cancel game and redirect when countdown expires
  useEffect(() => {
    if (countdown !== 0) return;
    void (async () => {
      try {
        await supabase
          .from('tic_tac_toe_games')
          .update({ status: 'cancelled' })
          .eq('id', roomId)
          .eq('status', 'active');
      } finally {
        router.push('/games/tic-tac-toe');
      }
    })();
  }, [countdown, roomId, router, supabase]);

  // Effect 6 — Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`ttt:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tic_tac_toe_games',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const newGame = payload.new as TicTacToeGameRow;
          const oldBoard = (payload.old as TicTacToeGameRow).board;
          const idx = newGame.board.findIndex((v, i) => v !== oldBoard[i]);
          if (idx !== -1) setLastMove(idx);
          setGame(newGame);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, supabase]);

  async function handleRematch() {
    setRematching(true);
    try {
      await supabase
        .from('tic_tac_toe_games')
        .update({ status: 'cancelled' })
        .eq('player_x', currentUserId)
        .eq('status', 'waiting');
      const { data } = await supabase
        .from('tic_tac_toe_games')
        .insert({ player_x: currentUserId })
        .select()
        .single();
      if (data) router.push(`/games/tic-tac-toe/${data.id}`);
      else router.push('/games/tic-tac-toe');
    } finally {
      setRematching(false);
    }
  }

  async function handleCellClick(i: number) {
    if (!isMyTurn || game.board[i] !== '' || game.status !== 'active') return;
    const newBoard = [...game.board] as CellValue[];
    newBoard[i] = mySymbol!;
    const winner = checkWinner(newBoard);
    const newStatus: GameStatus =
      winner === 'X' ? 'x_wins'
      : winner === 'O' ? 'o_wins'
      : winner === 'draw' ? 'draw'
      : 'active';

    setGame(g => ({
      ...g,
      board: newBoard,
      status: newStatus,
      current_turn: newStatus === 'active' ? (mySymbol === 'X' ? 'O' : 'X') : g.current_turn,
    }));
    setLastMove(i);

    const { error } = await supabase
      .from('tic_tac_toe_games')
      .update({
        board: newBoard,
        current_turn: mySymbol === 'X' ? 'O' : 'X',
        status: newStatus,
      })
      .eq('id', roomId)
      .eq('current_turn', mySymbol!)
      .eq('status', 'active');

    if (error) {
      // Re-fetch authoritative state to correct the optimistic update
      supabase
        .from('tic_tac_toe_games')
        .select('*')
        .eq('id', roomId)
        .single()
        .then(({ data: r }) => { if (r) setGame(r as TicTacToeGameRow); });
    }
  }

  if (game.status === 'cancelled') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="text-5xl">🚫</div>
        <p className="text-xl font-black text-slate-700">This game was cancelled</p>
        <button
          onClick={() => router.push('/games/tic-tac-toe')}
          className="rounded-2xl border-2 border-indigo-300 bg-indigo-600 px-6 py-2 text-sm font-black text-white shadow transition hover:bg-indigo-700 active:scale-95"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  const gameOver = game.status === 'x_wins' || game.status === 'o_wins' || game.status === 'draw';
  const iWon =
    (game.status === 'x_wins' && mySymbol === 'X') ||
    (game.status === 'o_wins' && mySymbol === 'O');
  const opponentWon =
    (game.status === 'x_wins' && mySymbol === 'O') ||
    (game.status === 'o_wins' && mySymbol === 'X');

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Waiting state — player X waiting for opponent */}
      {game.status === 'waiting' && mySymbol === 'X' && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 px-8 py-8 shadow-md">
          <div className="text-5xl animate-bounce">⏳</div>
          <p className="text-xl font-black text-indigo-800">Waiting for opponent…</p>
          <p className="text-sm font-semibold text-indigo-500">
            Your game is listed in the lobby — a friend can join from there.
          </p>
        </div>
      )}

      {/* Joining spinner */}
      {game.status === 'waiting' && joining && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-indigo-200 bg-indigo-50 px-8 py-8">
          <div className="text-5xl animate-spin">🌀</div>
          <p className="text-xl font-black text-indigo-800">Joining game…</p>
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
        <div className="flex flex-col items-center gap-2 rounded-3xl border-2 border-amber-300 bg-amber-50 px-6 py-5 text-center shadow-md w-full max-w-xs">
          <p className="text-lg font-black text-amber-800">⚠️ Opponent disconnected</p>
          <p className="text-sm font-semibold text-amber-600">
            Returning to lobby in {countdown}s…
          </p>
          <button
            onClick={() => router.push('/games/tic-tac-toe')}
            className="mt-1 rounded-2xl border-2 border-amber-400 bg-amber-500 px-6 py-2 text-sm font-black text-white shadow transition hover:bg-amber-600 active:scale-95"
          >
            Return Now
          </button>
        </div>
      )}

      {/* Active board or game over */}
      {(game.status === 'active' || gameOver || isSpectator) && (
        <div className="flex flex-col items-center gap-4 w-full max-w-xs">
          {/* Status bar */}
          {!gameOver && game.status === 'active' && (
            <p className={`text-lg font-black ${isMyTurn ? 'text-indigo-700' : 'text-slate-500'}`}>
              {isSpectator
                ? `${game.current_turn}'s turn`
                : isMyTurn
                ? '🎯 Your turn!'
                : `⏳ ${opponentUsername ?? "Opponent"}'s turn…`}
            </p>
          )}

          {/* Board */}
          <div className="grid grid-cols-3 gap-3 w-full">
            {game.board.map((cell, i) => (
              <button
                key={i}
                onClick={() => handleCellClick(i)}
                disabled={!isMyTurn || cell !== '' || game.status !== 'active'}
                className={`
                  aspect-square rounded-2xl border-2 text-5xl font-black shadow-sm
                  transition-all duration-100
                  ${cell === 'X' ? 'text-indigo-600' : 'text-rose-500'}
                  ${cell === '' && isMyTurn
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
              mt-2 flex flex-col items-center gap-3 rounded-3xl border-2 px-8 py-6 shadow-md w-full
              ${game.status === 'draw' ? 'border-slate-300 bg-slate-50'
                : iWon ? 'border-green-300 bg-green-50'
                : opponentWon ? 'border-rose-300 bg-rose-50'
                : 'border-slate-300 bg-slate-50'}
            `}>
              <div className="text-4xl">
                {game.status === 'draw' ? '🤝'
                  : iWon ? '🏆'
                  : opponentWon ? '😢'
                  : game.status === 'x_wins' ? '❌'
                  : '⭕'}
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
                  : game.status === 'x_wins' ? 'X wins!'
                  : 'O wins!'}
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
                  onClick={() => router.push('/games/tic-tac-toe')}
                  className="rounded-2xl border-2 border-indigo-300 bg-indigo-600 px-5 py-2 text-sm font-black text-white shadow transition hover:bg-indigo-700 active:scale-95"
                >
                  Lobby
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Symbol indicator + vs */}
      {mySymbol && game.status !== 'waiting' && (
        <p className="text-sm font-semibold text-slate-500">
          You ({mySymbol === 'X' ? <span className="font-black text-indigo-600">❌ X</span> : <span className="font-black text-rose-500">⭕ O</span>})
          {opponentUsername && <> vs <span className="font-black text-slate-700">{opponentUsername}</span></>}
        </p>
      )}
    </div>
  );
}
