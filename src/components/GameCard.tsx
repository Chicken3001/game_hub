import Link from "next/link";
import type { GameEntry } from "@/games/registry";

interface GameCardProps {
  game: GameEntry;
}

const GAME_COLORS: Record<string, { from: string; to: string; border: string }> = {
  "find-animal": {
    from: "from-rose-100",
    to: "to-pink-50",
    border: "border-rose-300",
  },
  "bubble-pop": {
    from: "from-cyan-100",
    to: "to-sky-50",
    border: "border-cyan-300",
  },
  "farm-match": {
    from: "from-emerald-100",
    to: "to-teal-50",
    border: "border-emerald-300",
  },
  "number-guess": {
    from: "from-sky-100",
    to: "to-blue-50",
    border: "border-sky-300",
  },
  "animal-match": {
    from: "from-orange-100",
    to: "to-amber-50",
    border: "border-orange-300",
  },
  "shape-sorter": {
    from: "from-purple-100",
    to: "to-violet-50",
    border: "border-purple-300",
  },
  "tic-tac-toe": {
    from: "from-indigo-100",
    to: "to-blue-50",
    border: "border-indigo-300",
  },
};

const DEFAULT_COLORS = {
  from: "from-violet-100",
  to: "to-purple-50",
  border: "border-violet-300",
};

export function GameCard({ game }: GameCardProps) {
  const colors = GAME_COLORS[game.id] ?? DEFAULT_COLORS;

  return (
    <Link href={game.path}>
      <div
        className={`rounded-3xl border-2 ${colors.border} bg-gradient-to-br ${colors.from} ${colors.to} p-4 shadow-md transition-all duration-200 hover:scale-[1.04] hover:-rotate-1 hover:shadow-xl cursor-pointer`}
      >
        <div className="text-5xl leading-none">{game.icon ?? "🎮"}</div>
        <h2 className="mt-3 text-lg font-black text-indigo-900">{game.name}</h2>
        <p className="mt-1 text-sm font-semibold text-indigo-600">{game.description}</p>
      </div>
    </Link>
  );
}
