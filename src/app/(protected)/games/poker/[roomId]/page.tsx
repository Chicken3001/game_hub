import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import { BlindLevelBadge } from '@/components/BlindLevelBadge';
import { PokerGame } from '@/games/poker';
import type { PokerGameRow, PokerPlayerRow, PokerHoleCardsRow } from '@/games/poker';

export default async function PokerRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const supabase = await createClient();

  const [{ data: { user } }, { data: game }, { data: players }, { data: holeCards }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('poker_games').select('*').eq('id', roomId).single(),
    supabase.from('poker_players').select('*').eq('game_id', roomId).order('seat'),
    supabase.from('poker_hole_cards').select('*').eq('game_id', roomId),
  ]);

  if (!game) notFound();

  const TERMINAL = ['finished', 'cancelled'];
  if (TERMINAL.includes(game.status)) redirect('/games/poker');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Link href="/games/poker">
          <Button variant="back" size="sm">🃏 Poker</Button>
        </Link>
        <h1 className="text-2xl font-black text-emerald-900">Game Room</h1>
        <BlindLevelBadge level={game.blind_level} intervalMinutes={game.blind_interval_minutes} />
      </div>
      <PokerGame
        initialGame={game as PokerGameRow}
        initialPlayers={(players ?? []) as PokerPlayerRow[]}
        initialHoleCards={(holeCards ?? []) as PokerHoleCardsRow[]}
        currentUserId={user!.id}
        roomId={roomId}
      />
    </div>
  );
}
