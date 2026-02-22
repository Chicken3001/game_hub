"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const ANIMALS = ["🐄", "🐷", "🐔", "🐑", "🐴", "🐕"];

function createDeck(): string[] {
  const pairs = [...ANIMALS, ...ANIMALS];
  return pairs.sort(() => Math.random() - 0.5);
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
  const [lastFlipped, setLastFlipped] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleCardClick = useCallback(
    (index: number) => {
      if (flipped.has(index) || matched.has(index) || isChecking) return;
      if (flipped.size === 2) return;

      const newFlipped = new Set(flipped);
      newFlipped.add(index);
      setFlipped(newFlipped);

      if (newFlipped.size === 1) {
        setLastFlipped(index);
      } else {
        setIsChecking(true);
        const [first, second] = Array.from(newFlipped);
        const match = deck[first] === deck[second];

        setTimeout(() => {
          if (match) {
            setMatched((m) => new Set([...m, first, second]));
          }
          setFlipped(new Set());
          setLastFlipped(null);
          setIsChecking(false);
        }, 600);
      }
    },
    [deck, flipped, matched, isChecking]
  );

  const reset = () => {
    setDeck(createDeck());
    setFlipped(new Set());
    setMatched(new Set());
    setLastFlipped(null);
    setIsChecking(false);
  };

  const gameWon = deck.length > 0 && matched.size === deck.length;

  if (!mounted || deck.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="font-medium text-sky-600">Getting ready…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="font-bold text-sky-800">
          Pairs found: {matched.size / 2} / {deck.length / 2}
        </p>
        <Button variant="secondary" size="sm" onClick={reset}>
          Shuffle & play again
        </Button>
      </div>

      {gameWon ? (
        <Card className="p-8 text-center border-emerald-300 bg-emerald-50">
          <p className="text-3xl font-bold text-emerald-800">🎉 You won!</p>
          <p className="mt-2 text-emerald-700 font-medium">You found all the pairs—awesome!</p>
          <Button className="mt-4" onClick={reset}>
            Play again
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
          {deck.map((animal, index) => (
            <button
              key={`${index}-${animal}`}
              type="button"
              onClick={() => handleCardClick(index)}
              className="flex aspect-square items-center justify-center rounded-2xl border-2 border-sky-200 bg-white text-4xl transition-all hover:border-orange-300 hover:bg-amber-50 hover:scale-105 disabled:cursor-not-allowed shadow-sm"
              disabled={isChecking}
            >
              {flipped.has(index) || matched.has(index) ? animal : "?"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
