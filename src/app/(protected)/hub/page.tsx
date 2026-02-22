import { GameCard } from "@/components/GameCard";
import { GAMES } from "@/games/registry";

export default function HubPage() {
  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold text-sky-900">Pick a game to play! 🎯</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
}
