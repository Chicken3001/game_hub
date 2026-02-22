import Link from "next/link";
import { ANIMAL_SETS } from "@/games/animal-match";
import { Button } from "@/components/ui/Button";

export default function AnimalMatchHubPage() {
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
        <h1 className="text-4xl font-black text-indigo-900">🐾 Animal Match</h1>
        <p className="mt-2 font-semibold text-violet-500">
          Pick an animal set, then tap or drag to connect the matching pairs!
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {ANIMAL_SETS.map((set) => (
          <Link key={set.id} href={`/games/animal-match/${set.id}`}>
            <div className="group rounded-3xl border-2 border-orange-200 bg-gradient-to-br from-orange-100 to-amber-50 p-6 shadow-md transition-all duration-200 hover:scale-[1.04] hover:-rotate-1 hover:shadow-xl cursor-pointer">
              <span className="text-6xl leading-none">{set.icon}</span>
              <h2 className="mt-4 text-xl font-black text-indigo-900">{set.name}</h2>
              <p className="mt-1.5 text-sm font-semibold text-indigo-600">
                Match all {set.animals.length} {set.name.toLowerCase()}!
              </p>
              <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-orange-200 px-3 py-1 text-sm font-bold text-orange-800">
                Play now →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
