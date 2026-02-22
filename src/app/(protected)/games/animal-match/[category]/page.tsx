import Link from "next/link";
import { AnimalMatchGame, ANIMAL_SETS } from "@/games/animal-match";
import { Button } from "@/components/ui/Button";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ category: string }>;
}

export default async function AnimalMatchCategoryPage({ params }: PageProps) {
  const { category } = await params;
  const set = ANIMAL_SETS.find((s) => s.id === category);
  if (!set) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/games/animal-match"
          className="inline-block rounded-2xl transition-transform hover:scale-105"
        >
          <Button variant="back" size="md">
            ← Pick another set
          </Button>
        </Link>
        <Link
          href="/hub"
          className="inline-block rounded-2xl transition-transform hover:scale-105"
        >
          <Button variant="back" size="md">
            🎮 Back to all games
          </Button>
        </Link>
      </div>
      <h1 className="text-3xl font-bold text-sky-900">
        {set.icon} {set.name}
      </h1>
      <p className="text-sky-700">Tap one animal on the left, then its match on the right!</p>
      <AnimalMatchGame set={set} />
    </div>
  );
}
