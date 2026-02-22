"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

const MIN = 1;
const MAX = 100;

function getRandomNumber(): number {
  return Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
}

export function NumberGuessGame() {
  const [target, setTarget] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTarget(getRandomNumber());
    setMounted(true);
  }, []);
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [gameWon, setGameWon] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const num = parseInt(guess, 10);
      if (isNaN(num) || num < MIN || num > MAX) {
        setMessage(`Enter a number between ${MIN} and ${MAX}`);
        return;
      }

      setAttempts((a) => a + 1);

      if (num === target) {
        setMessage(`You got it! It took you ${attempts + 1} ${attempts === 0 ? "try" : "tries"}. Nice work!`);
        setGameWon(true);
      } else if (num < target) {
        setMessage("Higher!");
      } else {
        setMessage("Lower!");
      }
      setGuess("");
    },
    [guess, target, attempts]
  );

  const reset = () => {
    setTarget(getRandomNumber());
    setGuess("");
    setMessage(null);
    setAttempts(0);
    setGameWon(false);
  };

  if (!mounted) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="font-medium text-sky-600">Getting ready…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="font-bold text-sky-800">Guesses: {attempts}</p>
        <Button variant="secondary" size="sm" onClick={reset}>
          Try a new number
        </Button>
      </div>

      <Card className="p-8">
        <p className="mb-6 text-lg font-medium text-sky-800">
          I'm thinking of a number between {MIN} and {MAX}. Type your guess below! 🤔
        </p>

        {gameWon ? (
          <div className="space-y-4">
            <p className="text-xl font-bold text-emerald-700">{message}</p>
            <Button onClick={reset}>Play again</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="number"
              min={MIN}
              max={MAX}
              placeholder="Type a number…"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              autoFocus
            />
            {message && (
              <p
                className={`text-base font-bold ${
                  message.includes("Correct")
                    ? "text-emerald-600"
                    : "text-sky-800"
                }`}
              >
                {message}
              </p>
            )}
            <Button type="submit">Guess!</Button>
          </form>
        )}
      </Card>
    </div>
  );
}
