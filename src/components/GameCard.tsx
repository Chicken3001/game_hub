import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { GameEntry } from "@/games/registry";

interface GameCardProps {
  game: GameEntry;
}

export function GameCard({ game }: GameCardProps) {
  return (
    <Link href={game.path}>
      <Card className="block p-6 transition-all hover:shadow-lg hover:scale-[1.02] hover:border-orange-300">
        <span className="text-5xl" aria-hidden>
          {game.icon ?? "🎮"}
        </span>
        <h2 className="mt-4 text-xl font-bold text-sky-900">
          {game.name}
        </h2>
        <p className="mt-2 text-sky-700">{game.description}</p>
      </Card>
    </Link>
  );
}
