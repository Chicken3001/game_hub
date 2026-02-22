import Link from "next/link";
import type { GameEntry } from "@/games/registry";

interface GameCardProps {
  game: GameEntry;
}

const GAME_COLORS: Record<string, { from: string; to: string; border: string; badge: string }> = {
  "farm-match": {
    from: "from-emerald-100",
    to: "to-teal-50",
    border: "border-emerald-300",
    badge: "bg-emerald-200 text-emerald-800",
  },
  "number-guess": {
    from: "from-sky-100",
    to: "to-cyan-50",
    border: "border-sky-300",
    badge: "bg-sky-200 text-sky-800",
  },
  "animal-match": {
    from: "from-orange-100",
    to: "to-amber-50",
    border: "border-orange-300",
    badge: "bg-orange-200 text-orange-800",
  },
};

const DEFAULT_COLORS = {
  from: "from-violet-100",
  to: "to-purple-50",
  border: "border-violet-300",
  badge: "bg-violet-200 text-violet-800",
};

export function GameCard({ game }: GameCardProps) {
  const colors = GAME_COLORS[game.id] ?? DEFAULT_COLORS;

  return (
    <Link href={game.path}>
      <div
        className={`group rounded-3xl border-2 ${colors.border} bg-gradient-to-br ${colors.from} ${colors.to} p-6 shadow-md transition-all duration-200 hover:scale-[1.04] hover:-rotate-1 hover:shadow-xl cursor-pointer`}
      >
        <div className="text-6xl leading-none">{game.icon ?? "🎮"}</div>
        <h2 className="mt-4 text-xl font-black text-indigo-900">{game.name}</h2>
        <p className="mt-1.5 text-sm font-semibold text-indigo-600">{game.description}</p>
        <span
          className={`mt-4 inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${colors.badge}`}
        >
          Play now →
        </span>
      </div>
    </Link>
  );
}
