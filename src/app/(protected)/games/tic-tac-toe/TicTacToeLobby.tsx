'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { TicTacToeGameRow } from '@/games/tic-tac-toe';

interface Props {
  userId: string;
}

export function TicTacToeLobby({ userId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [games, setGames] = useState<TicTacToeGameRow[]>([]);
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

  // Fetch open games + their creators' usernames on mount
  useEffect(() => {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    supabase
      .from('tic_tac_toe_games')
      .select('*')
      .eq('status', 'waiting')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        const rows = (data as TicTacToeGameRow[]) ?? [];
        setGames(rows);
        setLoading(false);
        await fetchUsernames([...new Set(rows.map(g => g.player_x))]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: add new waiting games, remove games that are no longer waiting
  useEffect(() => {
    const channel = supabase
      .channel('ttt:lobby')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tic_tac_toe_games' },
        async (payload) => {
          const game = payload.new as TicTacToeGameRow;
          const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
          if (game.status === 'waiting' && game.created_at >= cutoff) {
            setGames(prev => [game, ...prev]);
            await fetchUsernames([game.player_x]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tic_tac_toe_games' },
        (payload) => {
          const game = payload.new as TicTacToeGameRow;
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
    // Cancel any waiting games this user already owns so the lobby stays clean
    await supabase
      .from('tic_tac_toe_games')
      .update({ status: 'cancelled' })
      .eq('player_x', userId)
      .eq('status', 'waiting');
    const { data, error } = await supabase
      .from('tic_tac_toe_games')
      .insert({ player_x: userId })
      .select()
      .single();
    setCreating(false);
    if (!error && data) {
      router.push(`/games/tic-tac-toe/${data.id}`);
    }
  }

  function displayName(game: TicTacToeGameRow) {
    if (game.player_x === userId) return '⭐ You';
    return `🎮 ${usernames[game.player_x] ?? 'Someone'}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={handleCreate}
        disabled={creating}
        className="w-full rounded-2xl border-2 border-indigo-400 bg-indigo-600 px-6 py-3 font-black text-white shadow transition hover:bg-indigo-700 disabled:opacity-60 active:scale-95"
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
              onClick={() => router.push(`/games/tic-tac-toe/${game.id}`)}
              className={`rounded-xl border-2 px-4 py-2 text-sm font-black transition active:scale-95 ${
                game.player_x === userId
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  : 'border-green-300 bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {game.player_x === userId ? 'Resume' : 'Join'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
