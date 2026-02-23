import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import { Connect4Game } from '@/games/connect4';
import type { Connect4GameRow } from '@/games/connect4';

export default async function Connect4RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const supabase = await createClient();

  const [{ data: { user } }, { data: game }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('connect4_games').select('*').eq('id', roomId).single(),
  ]);

  if (!game) notFound();

  const TERMINAL = ['p1_wins', 'p2_wins', 'draw', 'cancelled'];
  if (TERMINAL.includes(game.status)) redirect('/games/connect4');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Link href="/games/connect4">
          <Button variant="back" size="sm">🔴 Connect 4</Button>
        </Link>
        <h1 className="text-2xl font-black text-rose-900">Game Room</h1>
      </div>
      <Connect4Game
        initialGame={game as Connect4GameRow}
        currentUserId={user!.id}
        roomId={roomId}
      />
    </div>
  );
}
