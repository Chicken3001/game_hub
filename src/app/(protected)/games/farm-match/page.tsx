import Link from "next/link";
import { AnimalMatchGame, ANIMAL_SETS } from "@/games/animal-match";
import { Button } from "@/components/ui/Button";

const FARM_SET = ANIMAL_SETS.find((s) => s.id === "farm")!;

export default function FarmMatchPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/hub"
          className="inline-block rounded-2xl transition-transform hover:scale-105"
        >
          <Button variant="back" size="md">
            🎮 Back to all games
          </Button>
        </Link>
      </div>
      <h1 className="text-3xl font-bold text-sky-900">🐄 Farm Animal Match</h1>
      <p className="text-sky-700">
        Tap one animal on either side, then tap its match on the other side. A line will connect them!
      </p>
      <AnimalMatchGame set={FARM_SET} />
    </div>
  );
}
