import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import { TicTacToeGame } from '@/games/tic-tac-toe';
import type { TicTacToeGameRow } from '@/games/tic-tac-toe';

export default async function TicTacToeRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const supabase = await createClient();

  const [{ data: { user } }, { data: game }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('tic_tac_toe_games').select('*').eq('id', roomId).single(),
  ]);

  if (!game) notFound();

  const TERMINAL = ['x_wins', 'o_wins', 'draw', 'cancelled'];
  if (TERMINAL.includes(game.status)) redirect('/games/tic-tac-toe');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Link href="/games/tic-tac-toe">
          <Button variant="back" size="sm">❌ Tic-Tac-Toe</Button>
        </Link>
        <h1 className="text-2xl font-black text-indigo-900">Game Room</h1>
      </div>
      <TicTacToeGame
        initialGame={game as TicTacToeGameRow}
        currentUserId={user!.id}
        roomId={roomId}
      />
    </div>
  );
}
