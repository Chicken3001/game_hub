"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/Button";

const ANIMALS = ["🐄", "🐷", "🐔", "🐑", "🐴", "🐕"];

const CARD_COLORS: Record<string, { bg: string; border: string }> = {
  "🐄": { bg: "#d1fae5", border: "#34d399" },
  "🐷": { bg: "#fce7f3", border: "#f472b6" },
  "🐔": { bg: "#fef9c3", border: "#facc15" },
  "🐑": { bg: "#dbeafe", border: "#60a5fa" },
  "🐴": { bg: "#ede9fe", border: "#a78bfa" },
  "🐕": { bg: "#ffedd5", border: "#fb923c" },
};

function createDeck(): string[] {
  return [...ANIMALS, ...ANIMALS].sort(() => Math.random() - 0.5);
}

export function FarmMatchGame() {
  const [deck, setDeck] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
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
      <div className="flex items-center justify-between rounded-2xl border-2 border-violet-100 bg-white px-5 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-violet-400">Pairs found</p>
            <p className="text-2xl font-black text-indigo-900">
              {matched.size / 2} / {deck.length / 2}
            </p>
          </div>
        </div>
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
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
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
