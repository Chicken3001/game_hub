import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Connect4Local } from '@/games/connect4/Connect4Local';

export default function Connect4LocalPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/games/connect4">
          <Button variant="back">← Back</Button>
        </Link>
        <h1 className="text-2xl font-black text-slate-800">🔴 Pass & Play 🟡</h1>
      </div>
      <Connect4Local />
    </div>
  );
}
