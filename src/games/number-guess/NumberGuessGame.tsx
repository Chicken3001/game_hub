"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

const MIN = 1;
const MAX = 100;

function getRandomNumber(): number {
  return Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
}

export function NumberGuessGame() {
  const [target, setTarget] = useState(getRandomNumber);
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
        setMessage(`Correct! You got it in ${attempts + 1} tries.`);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-stone-600">Attempts: {attempts}</p>
        <Button variant="secondary" size="sm" onClick={reset}>
          New game
        </Button>
      </div>

      <Card className="p-6">
        <p className="mb-4 text-stone-700">
          I'm thinking of a number between {MIN} and {MAX}. Guess it!
        </p>

        {gameWon ? (
          <div className="space-y-4">
            <p className="text-lg font-semibold text-green-700">{message}</p>
            <Button onClick={reset}>Play again</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="number"
              min={MIN}
              max={MAX}
              placeholder="Your guess"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              autoFocus
            />
            {message && (
              <p
                className={`text-sm font-medium ${
                  message.includes("Correct")
                    ? "text-green-600"
                    : "text-stone-700"
                }`}
              >
                {message}
              </p>
            )}
            <Button type="submit">Guess</Button>
          </form>
        )}
      </Card>
    </div>
  );
}
