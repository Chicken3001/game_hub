import Link from "next/link";
import { ANIMAL_SETS } from "@/games/animal-match";
import { Button } from "@/components/ui/Button";

export default function AnimalMatchHubPage() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Link href="/hub">
          <Button variant="back" size="sm">🎮 Hub</Button>
        </Link>
        <h1 className="text-2xl font-black text-indigo-900">🐾 Animal Match</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {ANIMAL_SETS.map((set) => (
          <Link key={set.id} href={`/games/animal-match/${set.id}`}>
            <div className="group rounded-3xl border-2 border-orange-200 bg-gradient-to-br from-orange-100 to-amber-50 p-5 shadow-md transition-all duration-200 hover:scale-[1.04] hover:-rotate-1 hover:shadow-xl cursor-pointer">
              <span className="text-5xl leading-none">{set.icon}</span>
              <h2 className="mt-3 text-xl font-black text-indigo-900">{set.name}</h2>
              <p className="mt-1 text-sm font-semibold text-indigo-600">
                Match all {set.animals.length} {set.name.toLowerCase()}!
              </p>
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-orange-200 px-3 py-1 text-sm font-bold text-orange-800">
                Play now →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
