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
        <Link href="/games/animal-match" className="inline-block transition-transform hover:scale-105">
          <Button variant="back" size="md">
            ← Pick another set
          </Button>
        </Link>
        <Link href="/hub" className="inline-block transition-transform hover:scale-105">
          <Button variant="back" size="md">
            🎮 All games
          </Button>
        </Link>
      </div>
      <div>
        <h1 className="text-4xl font-black text-indigo-900">
          {set.icon} {set.name}
        </h1>
        <p className="mt-2 font-semibold text-violet-500">
          Tap an animal to select it, then tap its match — or drag across to draw the line!
        </p>
      </div>
      <AnimalMatchGame set={set} />
    </div>
  );
}
