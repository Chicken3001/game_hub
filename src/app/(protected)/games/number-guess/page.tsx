import Link from "next/link";
import { NumberGuessGame } from "@/games/number-guess";
import { Button } from "@/components/ui/Button";

export default function NumberGuessPage() {
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
      <h1 className="text-3xl font-bold text-sky-900">🔢 Number Guessing</h1>
      <NumberGuessGame />
    </div>
  );
}
