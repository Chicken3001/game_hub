import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { RulesButton } from '@/components/RulesButton';
import { Connect4Lobby } from './Connect4Lobby';

export default async function Connect4Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Link href="/hub">
          <Button variant="back" size="sm">🎮 Hub</Button>
        </Link>
        <h1 className="text-2xl font-black text-rose-900">🔴 Connect 4</h1>
        <RulesButton game="connect4" />
      </div>
      <Connect4Lobby userId={user!.id} />
    </div>
  );
}
