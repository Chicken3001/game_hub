"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const MIN = 1;
const MAX = 100;

function getRandomNumber(): number {
  return Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
}

type HintKind = "higher" | "lower" | "win" | null;

const HINT_CONFIG: Record<
  Exclude<HintKind, null>,
  { emoji: string; label: string; bg: string; border: string; text: string }
> = {
  higher: {
    emoji: "⬆️",
    label: "Go higher!",
    bg: "bg-sky-100",
    border: "border-sky-300",
    text: "text-sky-800",
  },
  lower: {
    emoji: "⬇️",
    label: "Go lower!",
    bg: "bg-rose-100",
    border: "border-rose-300",
    text: "text-rose-800",
  },
  win: {
    emoji: "🎉",
    label: "You got it!",
    bg: "bg-emerald-100",
    border: "border-emerald-300",
    text: "text-emerald-800",
  },
};

export function NumberGuessGame() {
  const [target, setTarget] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTarget(getRandomNumber());
    setMounted(true);
  }, []);

  const [guess, setGuess] = useState("");
  const [hint, setHint] = useState<HintKind>(null);
  const [attempts, setAttempts] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [badInput, setBadInput] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const num = parseInt(guess, 10);
      if (isNaN(num) || num < MIN || num > MAX) {
        setBadInput(true);
        return;
      }
      setBadInput(false);
      const next = attempts + 1;
      setAttempts(next);

      if (num === target) {
        setHint("win");
        setGameWon(true);
      } else if (num < target) {
        setHint("higher");
      } else {
        setHint("lower");
      }
      setGuess("");
    },
    [guess, target, attempts]
  );

  const reset = () => {
    setTarget(getRandomNumber());
    setGuess("");
    setHint(null);
    setAttempts(0);
    setGameWon(false);
    setBadInput(false);
  };

  if (!mounted) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-xl font-bold text-violet-400">Getting ready… 🎮</p>
      </div>
    );
  }

  const hintCfg = hint ? HINT_CONFIG[hint] : null;

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="flex items-center justify-between rounded-2xl border-2 border-violet-100 bg-white px-4 py-2 shadow-sm">
        <p className="font-black text-indigo-900">🎯 {attempts} {attempts === 1 ? "guess" : "guesses"}</p>
        <Button variant="secondary" size="sm" onClick={reset}>
          New number 🔄
        </Button>
      </div>

      {/* Main card */}
      <div className="rounded-3xl border-2 border-violet-100 bg-white p-4 shadow-[0_4px_24px_rgba(139,92,246,0.12)]">
        <p className="text-center font-bold text-indigo-800">
          I&apos;m thinking of a number between{" "}
          <span className="font-black text-orange-500">{MIN}</span> and{" "}
          <span className="font-black text-orange-500">{MAX}</span> 🤔
        </p>

        {/* Hint block */}
        {hintCfg && (
          <div
            className={`mt-3 flex items-center justify-center gap-3 rounded-2xl border-2 ${hintCfg.border} ${hintCfg.bg} py-3 px-4`}
            style={{ animation: "pop-in 0.3s ease-out" }}
          >
            <span className="text-4xl leading-none">{hintCfg.emoji}</span>
            <div>
              <p className={`text-xl font-black ${hintCfg.text}`}>{hintCfg.label}</p>
              {hint === "win" && (
                <p className="text-sm font-bold text-emerald-700">
                  {attempts} {attempts === 1 ? "guess" : "guesses"}!
                </p>
              )}
            </div>
          </div>
        )}

        {/* Input */}
        {!gameWon ? (
          <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
            <Input
              type="number"
              min={MIN}
              max={MAX}
              placeholder={`A number from ${MIN} to ${MAX}…`}
              value={guess}
              onChange={(e) => {
                setGuess(e.target.value);
                setBadInput(false);
              }}
              autoFocus
              className="text-center text-xl"
            />
            {badInput && (
              <p className="text-center text-sm font-bold text-rose-500" role="alert">
                Please enter a number between {MIN} and {MAX}!
              </p>
            )}
            <Button type="submit" size="lg" className="w-full">
              Guess! 🚀
            </Button>
          </form>
        ) : (
          <Button size="lg" className="mt-3 w-full" onClick={reset}>
            Play again! 🎉
          </Button>
        )}
      </div>
    </div>
  );
}
