import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { TicTacToeVsComputer } from '@/games/tic-tac-toe/TicTacToeVsComputer';

export default function TicTacToeComputerPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/games/tic-tac-toe">
          <Button variant="back">← Back</Button>
        </Link>
        <h1 className="text-2xl font-black text-slate-800">❌ vs 🤖</h1>
      </div>
      <TicTacToeVsComputer />
    </div>
  );
}
