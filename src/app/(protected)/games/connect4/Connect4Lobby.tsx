'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Connect4GameRow } from '@/games/connect4';

interface Props {
  userId: string;
}

export function Connect4Lobby({ userId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [games, setGames] = useState<Connect4GameRow[]>([]);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function fetchUsernames(ids: string[]) {
    if (ids.length === 0) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', ids);
    if (data) {
      setUsernames(prev => {
        const next = { ...prev };
        data.forEach((p: { id: string; username: string }) => { next[p.id] = p.username; });
        return next;
      });
    }
  }

  // Fetch open games + creator usernames on mount
  useEffect(() => {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    supabase
      .from('connect4_games')
      .select('*')
      .eq('status', 'waiting')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        const rows = (data as Connect4GameRow[]) ?? [];
        setGames(rows);
        setLoading(false);
        await fetchUsernames([...new Set(rows.map(g => g.player_1))]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: track waiting games
  useEffect(() => {
    const channel = supabase
      .channel('c4:lobby')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'connect4_games' },
        async (payload) => {
          const game = payload.new as Connect4GameRow;
          const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
          if (game.status === 'waiting' && game.created_at >= cutoff) {
            setGames(prev => [game, ...prev]);
            await fetchUsernames([game.player_1]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'connect4_games' },
        (payload) => {
          const game = payload.new as Connect4GameRow;
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
    await supabase
      .from('connect4_games')
      .update({ status: 'cancelled' })
      .eq('player_1', userId)
      .eq('status', 'waiting');
    const { data, error } = await supabase
      .from('connect4_games')
      .insert({ player_1: userId })
      .select()
      .single();
    setCreating(false);
    if (!error && data) {
      router.push(`/games/connect4/${data.id}`);
    }
  }

  function displayName(game: Connect4GameRow) {
    if (game.player_1 === userId) return '⭐ You';
    return `🔴 ${usernames[game.player_1] ?? 'Someone'}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={handleCreate}
        disabled={creating}
        className="w-full rounded-2xl border-2 border-rose-400 bg-rose-600 px-6 py-3 font-black text-white shadow transition hover:bg-rose-700 disabled:opacity-60 active:scale-95"
      >
        {creating ? '⏳ Creating…' : '➕ Create New Game'}
      </button>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-black text-slate-700">Open Lobbies</h2>
        {loading && (
          <p className="text-sm font-semibold text-slate-400">Loading…</p>
        )}
        {!loading && games.length === 0 && (
          <p className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-400">
            No open games yet — create one to get started!
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
                {new Date(game.created_at).toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => router.push(`/games/connect4/${game.id}`)}
              className={`rounded-xl border-2 px-4 py-2 text-sm font-black transition active:scale-95 ${
                game.player_1 === userId
                  ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
                  : 'border-green-300 bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {game.player_1 === userId ? 'Resume' : 'Join'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
