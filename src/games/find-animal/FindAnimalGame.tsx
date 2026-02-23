"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";

interface Animal {
  emoji: string;
  name: string;
}

const ALL_ANIMALS: Animal[] = [
  { emoji: "🐶", name: "Dog" },
  { emoji: "🐱", name: "Cat" },
  { emoji: "🐭", name: "Mouse" },
  { emoji: "🐹", name: "Hamster" },
  { emoji: "🐰", name: "Bunny" },
  { emoji: "🦊", name: "Fox" },
  { emoji: "🐻", name: "Bear" },
  { emoji: "🐼", name: "Panda" },
  { emoji: "🐨", name: "Koala" },
  { emoji: "🐯", name: "Tiger" },
  { emoji: "🦁", name: "Lion" },
  { emoji: "🐮", name: "Cow" },
  { emoji: "🐷", name: "Pig" },
  { emoji: "🐸", name: "Frog" },
  { emoji: "🐧", name: "Penguin" },
  { emoji: "🐦", name: "Bird" },
  { emoji: "🦆", name: "Duck" },
  { emoji: "🐙", name: "Octopus" },
];

const ROUND_COUNT = 6;
const CHOICE_COUNT = 3;

function pickAnimals(count: number): Animal[] {
  return [...ALL_ANIMALS].sort(() => Math.random() - 0.5).slice(0, count);
}

function makeChoices(target: Animal, pool: Animal[]): Animal[] {
  const others = pool.filter((a) => a.name !== target.name);
  const distractors = [...others].sort(() => Math.random() - 0.5).slice(0, CHOICE_COUNT - 1);
  return [...distractors, target].sort(() => Math.random() - 0.5);
}

type Phase = "playing" | "correct" | "wrong" | "win";

export function FindAnimalGame() {
  const [queue, setQueue] = useState<Animal[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [choices, setChoices] = useState<Animal[]>([]);
  const [phase, setPhase] = useState<Phase>("playing");
  const [wrongChoice, setWrongChoice] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const startGame = useCallback(() => {
    const picked = pickAnimals(ROUND_COUNT);
    setQueue(picked);
    setRoundIdx(0);
    setPhase("playing");
    setWrongChoice(null);
    setChoices(makeChoices(picked[0], ALL_ANIMALS));
    setMounted(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startGame();
  }, [startGame]);

  const target = queue[roundIdx];

  const handleChoice = useCallback(
    (animal: Animal) => {
      if (phase !== "playing") return;
      if (animal.name === target.name) {
        setPhase("correct");
        setWrongChoice(null);
        setTimeout(() => {
          const next = roundIdx + 1;
          if (next >= ROUND_COUNT) {
            setPhase("win");
          } else {
            setRoundIdx(next);
            setChoices(makeChoices(queue[next], ALL_ANIMALS));
            setPhase("playing");
          }
        }, 900);
      } else {
        setPhase("wrong");
        setWrongChoice(animal.name);
        setTimeout(() => {
          setPhase("playing");
          setWrongChoice(null);
        }, 700);
      }
    },
    [phase, target, roundIdx, queue]
  );

  if (!mounted || !target) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-xl font-bold text-violet-400">Getting ready… 🎮</p>
      </div>
    );
  }

  if (phase === "win") {
    return (
      <div
        className="rounded-3xl border-2 border-rose-300 bg-gradient-to-br from-rose-100 to-pink-100 p-8 text-center shadow-lg"
        style={{ animation: "pop-in 0.4s ease-out" }}
      >
        <div className="text-7xl leading-none" style={{ animation: "float 2s ease-in-out infinite" }}>
          🌟
        </div>
        <p className="mt-4 text-3xl font-black text-rose-700">You found them all!</p>
        <p className="mt-2 text-lg font-bold text-rose-500">Amazing job! 🎉</p>
        <Button onClick={startGame} size="lg" className="mt-6">
          Play again! 🔄
        </Button>
      </div>
    );
  }

  const isCorrect = phase === "correct";
  const isWrong = phase === "wrong";

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Progress dots */}
      <div className="flex gap-2">
        {Array.from({ length: ROUND_COUNT }).map((_, i) => (
          <div
            key={i}
            className="h-3 w-3 rounded-full transition-all duration-300"
            style={{
              backgroundColor:
                i < roundIdx
                  ? "#10b981"
                  : i === roundIdx
                  ? "#f97316"
                  : "#e0d9ff",
            }}
          />
        ))}
      </div>

      {/* Prompt card */}
      <div
        className="w-full rounded-3xl border-2 border-rose-200 bg-white px-6 py-5 text-center shadow-md"
        style={{
          animation: isWrong ? "shake 0.6s ease-in-out" : undefined,
          borderColor: isCorrect ? "#10b981" : isWrong ? "#ef4444" : undefined,
          backgroundColor: isCorrect ? "#d1fae5" : isWrong ? "#fee2e2" : undefined,
        }}
      >
        <p className="text-base font-black text-indigo-700">Find the animal!</p>
        <div
          className="mt-1 text-[72px] leading-none"
          style={{ animation: isCorrect ? "celebrate-bounce 0.6s ease-in-out" : "float 3s ease-in-out infinite" }}
        >
          {target.emoji}
        </div>
        <p className="mt-1 text-2xl font-black text-indigo-900">{target.name}</p>
      </div>

      {/* Choice buttons */}
      <div className="grid w-full grid-cols-3 gap-3">
        {choices.map((animal) => {
          const isTarget = animal.name === target.name;
          const isWrongTap = wrongChoice === animal.name;
          return (
            <button
              key={animal.name}
              type="button"
              onClick={() => handleChoice(animal)}
              disabled={phase !== "playing"}
              className="flex flex-col items-center justify-center rounded-2xl border-[3px] bg-white py-4 shadow-md transition-all duration-150 active:scale-95 disabled:pointer-events-none"
              style={{
                borderColor:
                  isCorrect && isTarget
                    ? "#10b981"
                    : isWrong && isTarget
                    ? "#10b981"
                    : isWrongTap
                    ? "#ef4444"
                    : "#e0d9ff",
                backgroundColor:
                  isCorrect && isTarget
                    ? "#d1fae5"
                    : isWrong && isTarget
                    ? "#d1fae5"
                    : isWrongTap
                    ? "#fee2e2"
                    : "#ffffff",
              }}
            >
              <span className="text-5xl leading-none">{animal.emoji}</span>
              <span className="mt-1 text-xs font-black text-indigo-700">{animal.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
