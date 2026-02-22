import Link from "next/link";
import { FarmMatchGame } from "@/games/farm-match";
import { Button } from "@/components/ui/Button";

export default function FarmMatchPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/hub" className="inline-block transition-transform hover:scale-105">
          <Button variant="back" size="md">
            🎮 Back to all games
          </Button>
        </Link>
      </div>
      <div>
        <h1 className="text-4xl font-black text-indigo-900">🧠 Animal Memory Match</h1>
        <p className="mt-2 font-semibold text-violet-500">
          Flip two cards — if they match they stay open. Find all the pairs!
        </p>
      </div>
      <FarmMatchGame />
    </div>
  );
}
