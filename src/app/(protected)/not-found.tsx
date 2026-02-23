import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="text-6xl">🔍</div>
      <p className="text-2xl font-black text-slate-700">Page not found</p>
      <p className="text-sm font-semibold text-slate-400 max-w-xs">
        That page doesn&apos;t exist — it may have been a game room that already finished.
      </p>
      <Link href="/hub">
        <Button>Back to Hub</Button>
      </Link>
    </div>
  );
}
