"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/Button";

const PAIRS = 6;

const ALL_ANIMALS: { emoji: string; bg: string; border: string }[] = [
  { emoji: "🐄", bg: "#d1fae5", border: "#34d399" },
  { emoji: "🐷", bg: "#fce7f3", border: "#f472b6" },
  { emoji: "🐔", bg: "#fef9c3", border: "#facc15" },
  { emoji: "🐑", bg: "#dbeafe", border: "#60a5fa" },
  { emoji: "🐴", bg: "#ede9fe", border: "#a78bfa" },
  { emoji: "🐕", bg: "#ffedd5", border: "#fb923c" },
  { emoji: "🐈", bg: "#f5f3ff", border: "#c4b5fd" },
  { emoji: "🐇", bg: "#fdf2f8", border: "#f0abfc" },
  { emoji: "🦊", bg: "#fff7ed", border: "#fdba74" },
  { emoji: "🐻", bg: "#fef3c7", border: "#d97706" },
  { emoji: "🐼", bg: "#f0fdf4", border: "#86efac" },
  { emoji: "🐨", bg: "#f0f9ff", border: "#7dd3fc" },
  { emoji: "🦁", bg: "#fffbeb", border: "#fbbf24" },
  { emoji: "🐯", bg: "#fff7ed", border: "#fb923c" },
  { emoji: "🦒", bg: "#fefce8", border: "#fde047" },
  { emoji: "🐘", bg: "#f1f5f9", border: "#94a3b8" },
  { emoji: "🐸", bg: "#f0fdf4", border: "#4ade80" },
  { emoji: "🦋", bg: "#faf5ff", border: "#d8b4fe" },
  { emoji: "🐢", bg: "#ecfdf5", border: "#34d399" },
  { emoji: "🦜", bg: "#fff1f2", border: "#fb7185" },
  { emoji: "🦆", bg: "#ecfeff", border: "#22d3ee" },
  { emoji: "🐬", bg: "#eff6ff", border: "#60a5fa" },
  { emoji: "🐙", bg: "#fdf4ff", border: "#e879f9" },
  { emoji: "🦀", bg: "#fff1f2", border: "#f87171" },
];

const CARD_COLORS: Record<string, { bg: string; border: string }> = Object.fromEntries(
  ALL_ANIMALS.map(({ emoji, bg, border }) => [emoji, { bg, border }])
);

function createDeck(): string[] {
  const picked = [...ALL_ANIMALS]
    .sort(() => Math.random() - 0.5)
    .slice(0, PAIRS)
    .map((a) => a.emoji);
  return [...picked, ...picked].sort(() => Math.random() - 0.5);
}

export function FarmMatchGame() {
  const [deck, setDeck] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDeck(createDeck());
    setMounted(true);
  }, []);

  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [isChecking, setIsChecking] = useState(false);

  const handleCardClick = useCallback(
    (index: number) => {
      if (flipped.has(index) || matched.has(index) || isChecking) return;
      if (flipped.size >= 2) return;

      const newFlipped = new Set(flipped);
      newFlipped.add(index);
      setFlipped(newFlipped);

      if (newFlipped.size === 2) {
        setIsChecking(true);
        const [first, second] = Array.from(newFlipped);
        const isMatch = deck[first] === deck[second];

        setTimeout(() => {
          if (isMatch) {
            setMatched((m) => new Set([...m, first, second]));
          }
          setFlipped(new Set());
          setIsChecking(false);
        }, 900);
      }
    },
    [deck, flipped, matched, isChecking]
  );

  const reset = () => {
    setDeck(createDeck());
    setFlipped(new Set());
    setMatched(new Set());
    setIsChecking(false);
  };

  const gameWon = deck.length > 0 && matched.size === deck.length;

  if (!mounted || deck.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-xl font-bold text-violet-400">Getting ready… 🎮</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="flex items-center justify-between rounded-2xl border-2 border-violet-100 bg-white px-4 py-2 shadow-sm">
        <p className="font-black text-indigo-900">
          ✅ {matched.size / 2} / {deck.length / 2} pairs
        </p>
        <Button variant="secondary" size="sm" onClick={reset}>
          Shuffle 🔄
        </Button>
      </div>

      {gameWon ? (
        <div
          className="rounded-3xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-100 to-teal-100 p-8 text-center shadow-lg"
          style={{ animation: "pop-in 0.4s ease-out" }}
        >
          <div
            className="text-7xl leading-none"
            style={{ animation: "float 2s ease-in-out infinite" }}
          >
            🎉
          </div>
          <p className="mt-4 text-3xl font-black text-emerald-800">Amazing memory!</p>
          <p className="mt-2 text-lg font-bold text-emerald-700">
            You found all {deck.length / 2} pairs!
          </p>
          <Button onClick={reset} size="lg" className="mt-6">
            Play again! 🔄
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3">
          {deck.map((animal, index) => {
            const isRevealed = flipped.has(index) || matched.has(index);
            const isMatchedCard = matched.has(index);
            const colors = CARD_COLORS[animal] ?? { bg: "#f0fdf4", border: "#86efac" };

            return (
              <div
                key={`${index}-${animal}`}
                className="aspect-square"
                style={{ perspective: "500px" }}
              >
                <div
                  onClick={() => handleCardClick(index)}
                  className="relative h-full w-full transition-transform duration-500"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: isRevealed ? "rotateY(180deg)" : "rotateY(0deg)",
                    cursor: isChecking || isMatchedCard ? "default" : "pointer",
                  }}
                  role="button"
                  tabIndex={isChecking || isMatchedCard ? -1 : 0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") handleCardClick(index);
                  }}
                  aria-label={isRevealed ? animal : "Hidden card, click to flip"}
                >
                  {/* Card back */}
                  <div
                    className="absolute inset-0 rounded-3xl border-4 border-white bg-gradient-to-br from-indigo-400 to-violet-500 shadow-md flex items-center justify-center select-none"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <span className="text-4xl sm:text-5xl">⭐</span>
                  </div>

                  {/* Card front */}
                  <div
                    className="absolute inset-0 rounded-3xl border-4 shadow-md flex flex-col items-center justify-center select-none"
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      backgroundColor: colors.bg,
                      borderColor: isMatchedCard ? "#34d399" : colors.border,
                      boxShadow: isMatchedCard
                        ? "0 0 0 3px rgba(52,211,153,0.4), 0 4px 12px rgba(0,0,0,0.08)"
                        : "0 4px 12px rgba(0,0,0,0.08)",
                    }}
                  >
                    <span className="text-4xl sm:text-5xl leading-none">{animal}</span>
                    {isMatchedCard && (
                      <span className="mt-1 text-xs font-black text-emerald-600">✓ Match!</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
