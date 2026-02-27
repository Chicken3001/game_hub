import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import { CheckersGame } from '@/games/checkers';
import type { CheckersGameRow } from '@/games/checkers';

export default async function CheckersRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const supabase = await createClient();

  const [{ data: { user } }, { data: game }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('checkers_games').select('*').eq('id', roomId).single(),
  ]);

  if (!game) notFound();

  const TERMINAL = ['p1_wins', 'p2_wins', 'draw', 'cancelled'];
  if (TERMINAL.includes(game.status)) redirect('/games/checkers');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Link href="/games/checkers">
          <Button variant="back" size="sm">🔴 Checkers</Button>
        </Link>
        <h1 className="text-2xl font-black text-rose-900">Game Room</h1>
      </div>
      <CheckersGame
        initialGame={game as CheckersGameRow}
        currentUserId={user!.id}
        roomId={roomId}
      />
    </div>
  );
}
