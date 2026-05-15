import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { TicTacToeLocal } from '@/games/tic-tac-toe/TicTacToeLocal';

export default function TicTacToeLocalPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/games/tic-tac-toe">
          <Button variant="back">← Back</Button>
        </Link>
        <h1 className="text-2xl font-black text-slate-800">❌ Pass & Play</h1>
      </div>
      <TicTacToeLocal />
    </div>
  );
}
