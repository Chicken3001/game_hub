'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PokerTable } from './PokerTable';
import { getValidActions, getCurrentBlinds } from './logic';
import type { PokerGameRow, PokerPlayerRow, PokerHoleCardsRow, PlayerAction } from './types';

interface Props {
  initialGame: PokerGameRow;
  initialPlayers: PokerPlayerRow[];
  initialHoleCards: PokerHoleCardsRow[];
  currentUserId: string;
  roomId: string;
}

export function PokerGame({ initialGame, initialPlayers, initialHoleCards, currentUserId, roomId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [game, setGame] = useState(initialGame);
  const [players, setPlayers] = useState(initialPlayers);
  const [holeCards, setHoleCards] = useState(initialHoleCards);
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);
  const [acting, setActing] = useState(false);
  const [dealingNext, setDealingNext] = useState(false);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [actionTimeLeft, setActionTimeLeft] = useState<number | null>(null);
  const [showdownTimeLeft, setShowdownTimeLeft] = useState<number | null>(null);
  const [opponentGone, setOpponentGone] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const DISCONNECT_TIMEOUT = 60;

  const isHost = game.host_id === currentUserId;
  const myPlayer = players.find(p => p.user_id === currentUserId);
  const myHoleCard = holeCards.find(h => h.user_id === currentUserId);
  const isMyTurn = game.phase !== 'waiting' && game.phase !== 'showdown' && myPlayer?.seat === game.action_on_seat && !myPlayer?.is_folded && !myPlayer?.is_all_in;
  const blinds = getCurrentBlinds(game.blind_level);
  const isFinished = game.status === 'finished';
  const isShowdown = game.phase === 'showdown';

  const validActions = isMyTurn && myPlayer
    ? getValidActions(myPlayer.chips, myPlayer.current_bet, game.current_bet, blinds.big)
    : [];

  // Fetch usernames for all players
  useEffect(() => {
    const ids = players.map(p => p.user_id).filter(id => !usernames[id]);
    if (ids.length === 0) return;
    supabase
      .from('profiles')
      .select('id, username')
      .in('id', ids)
      .then(({ data }) => {
        if (data) {
          setUsernames(prev => {
            const next = { ...prev };
            data.forEach((p: { id: string; username: string }) => { next[p.id] = p.username; });
            return next;
          });
        }
      });
  }, [players, supabase, usernames]);

  // Cancel waiting game on unmount (host only)
  useEffect(() => {
    if (initialGame.status !== 'waiting' || !isHost) return;
    return () => {
      supabase
        .from('poker_games')
        .update({ status: 'cancelled' })
        .eq('id', roomId)
        .eq('status', 'waiting')
        .then(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Presence — disconnect detection
  useEffect(() => {
    if (!myPlayer || game.status !== 'active') return;
    const channel = supabase
      .channel(`presence:poker:${roomId}`)
      .on('presence', { event: 'leave' }, () => {
        setOpponentGone(true);
      })
      .on('presence', { event: 'join' }, () => {
        setOpponentGone(false);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId: currentUserId });
        }
      });
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, myPlayer?.user_id]);

  // Countdown on disconnect
  useEffect(() => {
    if (!opponentGone) { setCountdown(null); return; }
    setCountdown(DISCONNECT_TIMEOUT);
    const id = setInterval(() => {
      setCountdown(n => (n !== null && n > 1 ? n - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [opponentGone]);

  useEffect(() => {
    if (countdown !== 0) return;
    void (async () => {
      try {
        await supabase.from('poker_games')
          .update({ status: 'cancelled' })
          .eq('id', roomId).eq('status', 'active');
      } finally {
        router.push('/games/poker');
      }
    })();
  }, [countdown, roomId, router, supabase]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel(`poker:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poker_games', filter: `id=eq.${roomId}` },
        (payload) => { if (payload.new) setGame(payload.new as PokerGameRow); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poker_players', filter: `game_id=eq.${roomId}` },
        () => {
          // Refetch all players on any change
          supabase.from('poker_players').select('*').eq('game_id', roomId).order('seat')
            .then(({ data }) => { if (data) setPlayers(data as PokerPlayerRow[]); });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poker_hole_cards', filter: `game_id=eq.${roomId}` },
        () => {
          supabase.from('poker_hole_cards').select('*').eq('game_id', roomId)
            .then(({ data }) => { if (data) setHoleCards(data as PokerHoleCardsRow[]); });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, supabase]);

  // ── Action timer (derived from server deadline) ──────────────────────────
  useEffect(() => {
    if (!game.action_deadline) {
      setActionTimeLeft(null);
      return;
    }
    const deadline = new Date(game.action_deadline).getTime();
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setActionTimeLeft(remaining);
      return remaining;
    };
    if (tick() === 0) {
      supabase.rpc('poker_timeout_action', { p_game_id: roomId }).then(null, console.error);
      return;
    }
    const id = setInterval(() => {
      if (tick() === 0) {
        clearInterval(id);
        supabase.rpc('poker_timeout_action', { p_game_id: roomId }).then(null, console.error);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [game.action_deadline, roomId, supabase]);

  // ── Showdown timer (derived from server deadline) ──────────────────────
  useEffect(() => {
    if (!game.showdown_deadline) {
      setShowdownTimeLeft(null);
      return;
    }
    const deadline = new Date(game.showdown_deadline).getTime();
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setShowdownTimeLeft(remaining);
      return remaining;
    };
    if (tick() === 0) {
      supabase.rpc('poker_timeout_deal', { p_game_id: roomId }).then(null, console.error);
      return;
    }
    const id = setInterval(() => {
      if (tick() === 0) {
        clearInterval(id);
        supabase.rpc('poker_timeout_deal', { p_game_id: roomId }).then(null, console.error);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [game.showdown_deadline, roomId, supabase]);

  // ── Join game ──────────────────────────────────────────────────────────────
  async function handleJoin(seat: number) {
    if (myPlayer) return;
    setJoining(true);
    const { error } = await supabase.from('poker_players').insert({
      game_id: roomId,
      user_id: currentUserId,
      seat,
      chips: game.starting_chips,
    });
    if (!error) {
      const { data } = await supabase.from('poker_players').select('*').eq('game_id', roomId).order('seat');
      if (data) setPlayers(data as PokerPlayerRow[]);
    }
    setJoining(false);
  }

  // ── Start game (host only) ────────────────────────────────────────────────
  async function handleStart() {
    if (!isHost || players.length < 2) return;
    setStarting(true);
    await supabase.from('poker_games')
      .update({ status: 'active' })
      .eq('id', roomId)
      .eq('status', 'waiting');
    // Deal first hand via RPC
    await supabase.rpc('poker_deal_hand', { p_game_id: roomId });
    // Refetch state
    const [{ data: g }, { data: p }, { data: h }] = await Promise.all([
      supabase.from('poker_games').select('*').eq('id', roomId).single(),
      supabase.from('poker_players').select('*').eq('game_id', roomId).order('seat'),
      supabase.from('poker_hole_cards').select('*').eq('game_id', roomId),
    ]);
    if (g) setGame(g as PokerGameRow);
    if (p) setPlayers(p as PokerPlayerRow[]);
    if (h) setHoleCards(h as PokerHoleCardsRow[]);
    setStarting(false);
  }

  // ── Player action ──────────────────────────────────────────────────────────
  const handleAction = useCallback(async (action: PlayerAction, amount?: number) => {
    if (acting) return;
    setActing(true);
    try {
      await supabase.rpc('poker_player_action', {
        p_game_id: roomId,
        p_user_id: currentUserId,
        p_action: action,
        p_amount: amount ?? 0,
      });
    } catch (e) {
      console.error('Action error:', e);
    }
    setActing(false);
  }, [acting, roomId, currentUserId, supabase]);

  // ── Deal next hand (after showdown) ────────────────────────────────────────
  async function handleDealNext() {
    if (dealingNext) return;
    setDealingNext(true);
    await supabase.rpc('poker_deal_hand', { p_game_id: roomId });
    setDealingNext(false);
  }

  // ── Cancelled game ────────────────────────────────────────────────────────
  if (game.status === 'cancelled') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="text-5xl">🚫</div>
        <p className="text-xl font-black text-slate-700">This game was cancelled</p>
        <button
          onClick={() => router.push('/games/poker')}
          className="rounded-2xl border-2 border-emerald-300 bg-emerald-600 px-6 py-2 text-sm font-black text-white shadow transition hover:bg-emerald-700 active:scale-95"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  // ── Waiting room ──────────────────────────────────────────────────────────
  if (game.status === 'waiting') {
    const occupiedSeats = new Set(players.map(p => p.seat));
    const availableSeats = Array.from({ length: game.max_players }, (_, i) => i).filter(s => !occupiedSeats.has(s));

    return (
      <div className="flex flex-col items-center gap-6 py-4">
        <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 px-8 py-8 shadow-md w-full max-w-sm">
          <div className="text-5xl animate-bounce">⏳</div>
          <p className="text-xl font-black text-emerald-800">
            {isHost ? 'Waiting for players…' : 'Pick a seat to join'}
          </p>
          <p className="text-sm font-semibold text-emerald-500">
            {players.length}/{game.max_players} players · {game.starting_chips} chips · {game.blind_interval_minutes}m blinds
            {game.action_time_seconds > 0 ? ` · ${game.action_time_seconds}s timer` : ' · No time limit'}
          </p>

          {/* Seat list */}
          <div className="flex flex-col gap-2 w-full mt-2">
            {Array.from({ length: game.max_players }, (_, i) => {
              const seated = players.find(p => p.seat === i);
              return (
                <div key={i} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <span className="text-sm font-black text-slate-500">Seat {i + 1}</span>
                  {seated ? (
                    <span className={`text-sm font-black ${seated.user_id === currentUserId ? 'text-blue-600' : 'text-slate-700'}`}>
                      {seated.user_id === currentUserId ? '⭐ You' : usernames[seated.user_id] ?? 'Player'}
                    </span>
                  ) : !myPlayer ? (
                    <button
                      onClick={() => handleJoin(i)}
                      disabled={joining}
                      className="rounded-lg border border-green-300 bg-green-500 px-3 py-1 text-xs font-black text-white transition hover:bg-green-600 disabled:opacity-50 active:scale-95"
                    >
                      {joining ? '…' : 'Sit'}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-300">Empty</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Start button (host only) */}
          {isHost && players.length >= 2 && (
            <button
              onClick={handleStart}
              disabled={starting}
              className="mt-3 w-full rounded-2xl border-2 border-emerald-400 bg-emerald-600 px-6 py-3 font-black text-white shadow transition hover:bg-emerald-700 disabled:opacity-60 active:scale-95"
            >
              {starting ? '⏳ Starting…' : `🎮 Start Game (${players.length} players)`}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Disconnect warning ─────────────────────────────────────────────────────
  const showDisconnect = opponentGone && !isFinished && !isShowdown && myPlayer && countdown !== null;

  // ── Tournament winner ──────────────────────────────────────────────────────
  const tournamentWinner = isFinished && game.winner_id;

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {showDisconnect && (
        <div className="flex flex-col items-center gap-2 rounded-3xl border-2 border-amber-300 bg-amber-50 px-6 py-5 text-center shadow-md w-full max-w-sm">
          <p className="text-lg font-black text-amber-800">⚠️ Player disconnected</p>
          <p className="text-sm font-semibold text-amber-600">
            Returning to lobby in {countdown}s…
          </p>
        </div>
      )}

      {/* Tournament winner */}
      {tournamentWinner && (
        <div className={`flex flex-col items-center gap-3 rounded-3xl border-2 px-8 py-6 shadow-md w-full max-w-sm ${
          game.winner_id === currentUserId ? 'border-green-300 bg-green-50' : 'border-slate-300 bg-slate-50'
        }`}>
          <div className="text-4xl">🏆</div>
          <p className={`text-xl font-black ${game.winner_id === currentUserId ? 'text-green-700' : 'text-slate-700'}`}>
            {game.winner_id === currentUserId ? 'You win the tournament!' : `${usernames[game.winner_id!] ?? 'Player'} wins!`}
          </p>
          <button
            onClick={() => router.push('/games/poker')}
            className="rounded-2xl border-2 border-emerald-300 bg-emerald-600 px-5 py-2 text-sm font-black text-white shadow transition hover:bg-emerald-700 active:scale-95"
          >
            Back to Lobby
          </button>
        </div>
      )}

      {/* Showdown result + deal next */}
      {isShowdown && !isFinished && (
        <div className="flex flex-col items-center gap-2 w-full max-w-sm">
          <div className="rounded-xl bg-amber-100 border border-amber-300 px-4 py-2 text-center">
            <p className="text-sm font-black text-amber-800">
              {game.last_action === 'win_by_fold' ? 'Everyone folded!' : 'Showdown!'}
            </p>
          </div>
          {game.showdown_time_seconds > 0 && showdownTimeLeft !== null ? (
            <p className="text-sm font-black text-emerald-600">
              Next hand in {showdownTimeLeft}s
            </p>
          ) : (
            <>
              {isHost && (
                <button
                  onClick={handleDealNext}
                  disabled={dealingNext}
                  className="w-full rounded-2xl border-2 border-emerald-400 bg-emerald-600 px-6 py-3 font-black text-white shadow transition hover:bg-emerald-700 disabled:opacity-60 active:scale-95"
                >
                  {dealingNext ? '⏳ Dealing…' : '🃏 Deal Next Hand'}
                </button>
              )}
              {!isHost && (
                <p className="text-sm font-semibold text-slate-500">Waiting for host to deal next hand…</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Eliminated spectator notice */}
      {myPlayer?.is_eliminated && !isFinished && (
        <div className="flex flex-col items-center gap-2 rounded-3xl border-2 border-amber-200 bg-amber-50 px-6 py-4 shadow-md w-full max-w-sm">
          <div className="text-3xl">👀</div>
          <p className="text-lg font-black text-amber-800">You&apos;re eliminated</p>
          <p className="text-sm font-semibold text-amber-600">You can spectate until the tournament ends</p>
        </div>
      )}

      {/* The poker table */}
      <PokerTable
        players={players}
        communityCards={game.community_cards}
        pot={game.pot}
        phase={game.phase as 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'}
        currentBet={game.current_bet}
        blindLevel={game.blind_level}
        blindSmall={blinds.small}
        blindBig={blinds.big}
        actionOnSeat={game.action_on_seat}
        myUserId={currentUserId}
        myHoleCards={myHoleCard?.cards ?? []}
        validActions={validActions}
        onAction={handleAction}
        isMyTurn={isMyTurn}
        handNumber={game.hand_number}
        lastAction={game.last_action}
        usernames={usernames}
        actionTimeLeft={actionTimeLeft}
      />

      {/* Player indicator */}
      {myPlayer && game.status === 'active' && (
        <p className="text-sm font-semibold text-slate-500">
          You (<span className="font-black text-blue-600">Seat {myPlayer.seat + 1}</span>)
          · {myPlayer.chips} chips
        </p>
      )}
    </div>
  );
}
