import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { GameEntry } from "@/games/registry";

interface GameCardProps {
  game: GameEntry;
}

export function GameCard({ game }: GameCardProps) {
  return (
    <Link href={game.path}>
      <Card className="block p-6 transition-shadow hover:shadow-md">
        <span className="text-4xl" aria-hidden>
          {game.icon ?? "🎮"}
        </span>
        <h2 className="mt-3 text-xl font-semibold text-stone-900">
          {game.name}
        </h2>
        <p className="mt-2 text-sm text-stone-600">{game.description}</p>
      </Card>
    </Link>
  );
}
