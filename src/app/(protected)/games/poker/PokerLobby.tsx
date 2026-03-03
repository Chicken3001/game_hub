'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { PokerGameRow } from '@/games/poker';

interface Props {
  userId: string;
}

export function PokerLobby({ userId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [games, setGames] = useState<PokerGameRow[]>([]);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Config state
  const [showConfig, setShowConfig] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(9);
  const [startingChips, setStartingChips] = useState(1000);
  const [blindInterval, setBlindInterval] = useState(10);

  async function fetchUsernames(ids: string[]) {
    if (ids.length === 0) return;
    const { data } = await supabase.from('profiles').select('id, username').in('id', ids);
    if (data) {
      setUsernames(prev => {
        const next = { ...prev };
        data.forEach((p: { id: string; username: string }) => { next[p.id] = p.username; });
        return next;
      });
    }
  }

  useEffect(() => {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    void (async () => {
      try {
        const { data } = await supabase
          .from('poker_games')
          .select('*')
          .eq('status', 'waiting')
          .gte('created_at', cutoff)
          .order('created_at', { ascending: false });
        const rows = (data as PokerGameRow[]) ?? [];
        setGames(rows);
        await fetchUsernames([...new Set(rows.map(g => g.host_id))]);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('poker:lobby')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'poker_games' },
        async (payload) => {
          const game = payload.new as PokerGameRow;
          const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
          if (game.status === 'waiting' && game.created_at >= cutoff) {
            setGames(prev => [game, ...prev]);
            await fetchUsernames([game.host_id]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'poker_games' },
        (payload) => {
          const game = payload.new as PokerGameRow;
          setGames(prev =>
            game.status === 'waiting'
              ? prev.some(g => g.id === game.id) ? prev : [game, ...prev]
              : prev.filter(g => g.id !== game.id)
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function handleCreate() {
    setCreating(true);
    // Cancel any existing waiting games from this user
    await supabase
      .from('poker_games')
      .update({ status: 'cancelled' })
      .eq('host_id', userId)
      .eq('status', 'waiting');
    const { data, error } = await supabase
      .from('poker_games')
      .insert({
        host_id: userId,
        max_players: maxPlayers,
        starting_chips: startingChips,
        blind_interval_minutes: blindInterval,
      })
      .select()
      .single();
    if (!error && data) {
      // Auto-join as seat 0
      await supabase.from('poker_players').insert({
        game_id: data.id,
        user_id: userId,
        seat: 0,
        chips: startingChips,
      });
      router.push(`/games/poker/${data.id}`);
    }
    setCreating(false);
  }

  function displayName(game: PokerGameRow) {
    if (game.host_id === userId) return '⭐ You';
    return `🃏 ${usernames[game.host_id] ?? 'Someone'}`;
  }

  return (
    <div className="flex flex-col gap-4">
      {!showConfig ? (
        <button
          onClick={() => setShowConfig(true)}
          disabled={creating}
          className="w-full rounded-2xl border-2 border-emerald-400 bg-emerald-600 px-6 py-3 font-black text-white shadow transition hover:bg-emerald-700 disabled:opacity-60 active:scale-95"
        >
          ➕ Create New Game
        </button>
      ) : (
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 flex flex-col gap-3">
          <h3 className="font-black text-emerald-800">Game Settings</h3>

          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-emerald-700">Max Players</label>
            <select
              value={maxPlayers}
              onChange={e => setMaxPlayers(Number(e.target.value))}
              className="rounded-lg border border-emerald-300 px-2 py-1 text-sm font-semibold"
            >
              {[2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-emerald-700">Starting Chips</label>
            <select
              value={startingChips}
              onChange={e => setStartingChips(Number(e.target.value))}
              className="rounded-lg border border-emerald-300 px-2 py-1 text-sm font-semibold"
            >
              {[500, 1000, 2000, 5000].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-emerald-700">Blind Increase</label>
            <select
              value={blindInterval}
              onChange={e => setBlindInterval(Number(e.target.value))}
              className="rounded-lg border border-emerald-300 px-2 py-1 text-sm font-semibold"
            >
              {[5, 10, 15, 20, 30].map(n => (
                <option key={n} value={n}>{n} min</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex-1 rounded-xl border-2 border-emerald-400 bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow transition hover:bg-emerald-700 disabled:opacity-60 active:scale-95"
            >
              {creating ? '⏳ Creating…' : '🎮 Start'}
            </button>
            <button
              onClick={() => setShowConfig(false)}
              className="rounded-xl border-2 border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-600 shadow transition hover:bg-slate-50 active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => router.push('/games/poker/computer')}
        className="w-full rounded-2xl border-2 border-slate-300 bg-white px-6 py-3 font-black text-slate-700 shadow transition hover:bg-slate-50 active:scale-95"
      >
        🤖 Play vs Computer
      </button>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-black text-slate-700">Open Tables</h2>
        {loading && (
          <p className="text-sm font-semibold text-slate-400">Loading…</p>
        )}
        {!loading && games.length === 0 && (
          <p className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-400">
            No open tables yet — create one to get started!
          </p>
        )}
        {games.map(game => (
          <div
            key={game.id}
            className="flex items-center justify-between rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <div>
              <p className="font-black text-slate-800">{displayName(game)}</p>
              <p className="text-xs text-slate-400">
                {game.max_players} max · {game.starting_chips} chips · {game.blind_interval_minutes}m blinds
              </p>
            </div>
            <button
              onClick={() => router.push(`/games/poker/${game.id}`)}
              className={`rounded-xl border-2 px-4 py-2 text-sm font-black transition active:scale-95 ${
                game.host_id === userId
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-green-300 bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {game.host_id === userId ? 'Resume' : 'Join'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
