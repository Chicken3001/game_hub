import Link from "next/link";
import { FarmMatchGame } from "@/games/farm-match";
import { Button } from "@/components/ui/Button";

export default function FarmMatchPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/hub">
          <Button variant="ghost" size="sm">
            ← Back to hub
          </Button>
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-stone-900">Farm Animal Match</h1>
      <FarmMatchGame />
    </div>
  );
}
