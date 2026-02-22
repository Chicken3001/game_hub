import Link from "next/link";
import { FindAnimalGame } from "@/games/find-animal";

export default function FindAnimalPage() {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/hub"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl shadow-md transition-transform hover:scale-110"
        >
          ←
        </Link>
        <h1 className="text-2xl font-black text-indigo-900">Find the Animal! 🔍</h1>
      </div>
      <FindAnimalGame />
    </div>
  );
}
