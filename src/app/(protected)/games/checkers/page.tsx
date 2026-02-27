import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { RulesButton } from '@/components/RulesButton';
import { CheckersLobby } from './CheckersLobby';

export default async function CheckersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Link href="/hub">
          <Button variant="back" size="sm">🎮 Hub</Button>
        </Link>
        <h1 className="text-2xl font-black text-rose-900">🔴 Checkers</h1>
        <RulesButton game="checkers" />
      </div>
      <CheckersLobby userId={user!.id} />
    </div>
  );
}
