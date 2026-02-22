import Link from "next/link";
import { FarmMatchGame } from "@/games/farm-match";
import { Button } from "@/components/ui/Button";

export default function FarmMatchPage() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Link href="/hub">
          <Button variant="back" size="sm">🎮 Hub</Button>
        </Link>
        <h1 className="text-2xl font-black text-indigo-900">🧠 Animal Memory Match</h1>
      </div>
      <FarmMatchGame />
    </div>
  );
}
