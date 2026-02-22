import { GameCard } from "@/components/GameCard";
import { GAMES } from "@/games/registry";

export default function HubPage() {
  return (
    <div>
      <h1 className="mb-2 text-4xl font-black text-indigo-900">Pick a game! 🎯</h1>
      <p className="mb-8 text-lg font-semibold text-violet-500">What do you feel like playing today?</p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
}
