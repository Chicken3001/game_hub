import { GameCard } from "@/components/GameCard";
import { GAMES } from "@/games/registry";

export default function HubPage() {
  return (
    <div>
      <h1 className="mb-4 text-3xl font-black text-indigo-900">Pick a game! 🎯</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
}
