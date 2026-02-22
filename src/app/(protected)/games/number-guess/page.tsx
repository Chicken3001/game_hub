import Link from "next/link";
import { NumberGuessGame } from "@/games/number-guess";
import { Button } from "@/components/ui/Button";

export default function NumberGuessPage() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Link href="/hub">
          <Button variant="back" size="sm">🎮 Hub</Button>
        </Link>
        <h1 className="text-2xl font-black text-indigo-900">🔢 Number Guessing</h1>
      </div>
      <NumberGuessGame />
    </div>
  );
}
