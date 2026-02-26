import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { RulesButton } from '@/components/RulesButton';
import { TicTacToeLobby } from './TicTacToeLobby';

export default async function TicTacToePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Link href="/hub">
          <Button variant="back" size="sm">🎮 Hub</Button>
        </Link>
        <h1 className="text-2xl font-black text-indigo-900">❌ Tic-Tac-Toe</h1>
        <RulesButton game="tic-tac-toe" />
      </div>
      <TicTacToeLobby userId={user!.id} />
    </div>
  );
}
