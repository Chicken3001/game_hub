import Link from "next/link";
import { ANIMAL_SETS } from "@/games/animal-match";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function AnimalMatchHubPage() {
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
      <h1 className="text-3xl font-bold text-sky-900">🐾 Tap to Match Animals</h1>
      <p className="text-sky-700">
        Pick an animal set, then tap one animal on the left and its match on the right!
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {ANIMAL_SETS.map((set) => (
          <Link key={set.id} href={`/games/animal-match/${set.id}`}>
            <Card className="block p-6 transition-all hover:scale-[1.02] hover:shadow-lg hover:border-orange-300">
              <span className="text-5xl">{set.icon}</span>
              <h2 className="mt-4 text-xl font-bold text-sky-900">{set.name}</h2>
              <p className="mt-2 text-sky-600">
                Match the {set.animals.length} {set.name.toLowerCase()}!
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
