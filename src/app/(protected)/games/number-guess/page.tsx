import Link from "next/link";
import { NumberGuessGame } from "@/games/number-guess";
import { Button } from "@/components/ui/Button";

export default function NumberGuessPage() {
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
        <h1 className="text-4xl font-black text-indigo-900">🔢 Number Guessing</h1>
        <p className="mt-2 font-semibold text-violet-500">
          Can you figure out the secret number?
        </p>
      </div>
      <NumberGuessGame />
    </div>
  );
}
