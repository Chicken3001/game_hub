import Link from "next/link";
import { NumberGuessGame } from "@/games/number-guess";
import { Button } from "@/components/ui/Button";

export default function NumberGuessPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/hub">
          <Button variant="ghost" size="sm">
            ← Back to hub
          </Button>
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-stone-900">Number Guessing</h1>
      <NumberGuessGame />
    </div>
  );
}
