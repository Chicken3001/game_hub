"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const ANIMALS = ["🐄", "🐷", "🐔", "🐑", "🐴", "🐕"];

function createDeck(): string[] {
  const pairs = [...ANIMALS, ...ANIMALS];
  return pairs.sort(() => Math.random() - 0.5);
}

export function FarmMatchGame() {
  const [deck, setDeck] = useState<string[]>(() => createDeck());
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

  const gameWon = matched.size === deck.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-stone-600">
          Matched: {matched.size / 2} / {deck.length / 2}
        </p>
        <Button variant="secondary" size="sm" onClick={reset}>
          New game
        </Button>
      </div>

      {gameWon ? (
        <Card className="p-8 text-center">
          <p className="text-2xl font-bold text-stone-900">You won!</p>
          <p className="mt-2 text-stone-600">All pairs matched.</p>
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
              className="flex aspect-square items-center justify-center rounded-lg border-2 border-stone-200 bg-white text-3xl transition-colors hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed"
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
