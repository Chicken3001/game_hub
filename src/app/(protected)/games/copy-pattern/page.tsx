import Link from "next/link";
import { CopyPatternGame } from "@/games/copy-pattern";

export default function CopyPatternPage() {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/hub"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl shadow-md transition-transform hover:scale-110"
        >
          ←
        </Link>
        <h1 className="text-2xl font-black text-indigo-900">Copy the Pattern! 🎵</h1>
      </div>
      <CopyPatternGame />
    </div>
  );
}
