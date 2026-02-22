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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/games/animal-match">
          <Button variant="back" size="sm">← Sets</Button>
        </Link>
        <Link href="/hub">
          <Button variant="back" size="sm">🎮 Hub</Button>
        </Link>
        <h1 className="text-2xl font-black text-indigo-900">{set.icon} {set.name}</h1>
      </div>
      <AnimalMatchGame set={set} />
    </div>
  );
}
