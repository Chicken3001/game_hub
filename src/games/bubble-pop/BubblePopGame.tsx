"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/Button";

const EMOJIS = ["🐶", "🐱", "🐭", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐧", "🦆", "🐙", "🦋", "🌸", "⭐", "🍓"];

const BUBBLE_COLORS = [
  "#fde68a", "#fca5a5", "#a5f3fc", "#bbf7d0", "#ddd6fe", "#fed7aa", "#f9a8d4", "#bae6fd",
];

const GAME_DURATION = 30; // seconds
const SPAWN_INTERVAL = 1200; // ms between new bubbles
const BUBBLE_SPEED_MIN = 5000; // ms for bubble to travel top→bottom (slow = easy)
const BUBBLE_SPEED_MAX = 8000;

interface Bubble {
  id: number;
  emoji: string;
  color: string;
  size: number; // px
  left: number; // % from left
  duration: number; // ms
  spawnedAt: number;
}

interface Burst {
  id: number;
  x: number;
  y: number;
  emoji: string;
  color: string;
}

let nextId = 1;

export function BubblePopGame() {
  const [playing, setPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [gameOver, setGameOver] = useState(false);

  const spawnTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimers = useCallback(() => {
    if (spawnTimer.current) clearInterval(spawnTimer.current);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
  }, []);

  const spawnBubble = useCallback(() => {
    const bubble: Bubble = {
      id: nextId++,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
      size: Math.floor(Math.random() * 30) + 60, // 60–90px
      left: Math.random() * 80 + 5, // 5%–85%
      duration: Math.random() * (BUBBLE_SPEED_MAX - BUBBLE_SPEED_MIN) + BUBBLE_SPEED_MIN,
      spawnedAt: Date.now(),
    };
    setBubbles((prev) => [...prev, bubble]);
  }, []);

  const startGame = useCallback(() => {
    setBubbles([]);
    setBursts([]);
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setGameOver(false);
    setPlaying(true);
  }, []);

  useEffect(() => {
    if (!playing) return;

    spawnBubble(); // immediate first bubble
    spawnTimer.current = setInterval(spawnBubble, SPAWN_INTERVAL);

    countdownTimer.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          stopTimers();
          setPlaying(false);
          setGameOver(true);
          setBubbles([]);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return stopTimers;
  }, [playing, spawnBubble, stopTimers]);

  // Remove bubbles that have floated off screen
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setBubbles((prev) => prev.filter((b) => now - b.spawnedAt < b.duration + 500));
    }, 500);
    return () => clearInterval(interval);
  }, [playing]);

  const popBubble = useCallback((bubble: Bubble, e: React.PointerEvent) => {
    e.stopPropagation();
    setBubbles((prev) => prev.filter((b) => b.id !== bubble.id));
    setScore((s) => s + 1);

    const containerEl = (e.currentTarget as HTMLElement).closest(".bubble-container") as HTMLElement | null;
    const containerRect = containerEl?.getBoundingClientRect();
    const x = containerRect ? e.clientX - containerRect.left : e.clientX;
    const y = containerRect ? e.clientY - containerRect.top : e.clientY;

    const burst: Burst = { id: nextId++, x, y, emoji: bubble.emoji, color: bubble.color };
    setBursts((prev) => [...prev, burst]);
    setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== burst.id)), 500);
  }, []);

  if (gameOver) {
    return (
      <div
        className="rounded-3xl border-2 border-cyan-300 bg-gradient-to-br from-cyan-100 to-sky-100 p-8 text-center shadow-lg"
        style={{ animation: "pop-in 0.4s ease-out" }}
      >
        <div className="text-7xl leading-none" style={{ animation: "float 2s ease-in-out infinite" }}>
          🫧
        </div>
        <p className="mt-4 text-3xl font-black text-cyan-800">Time&apos;s up!</p>
        <p className="mt-2 text-xl font-bold text-cyan-700">
          You popped <span className="font-black text-orange-500">{score}</span> bubbles!
        </p>
        {score >= 15 && <p className="mt-1 text-base font-bold text-emerald-600">Amazing! 🌟</p>}
        {score >= 8 && score < 15 && <p className="mt-1 text-base font-bold text-sky-600">Great job! 🎉</p>}
        {score < 8 && <p className="mt-1 text-base font-bold text-indigo-600">Keep trying! 💪</p>}
        <Button onClick={startGame} size="lg" className="mt-6">
          Play again! 🔄
        </Button>
      </div>
    );
  }

  if (!playing) {
    return (
      <div className="flex flex-col items-center gap-6 rounded-3xl border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-sky-50 p-8 text-center shadow-md">
        <div className="text-7xl leading-none" style={{ animation: "float 2s ease-in-out infinite" }}>
          🫧
        </div>
        <div>
          <p className="text-2xl font-black text-cyan-800">Bubble Pop!</p>
          <p className="mt-1 text-base font-bold text-cyan-600">
            Pop as many bubbles as you can in {GAME_DURATION} seconds!
          </p>
        </div>
        <Button onClick={startGame} size="lg">
          Start! 🚀
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Stats bar */}
      <div className="flex items-center justify-between rounded-2xl border-2 border-cyan-100 bg-white px-4 py-2 shadow-sm">
        <p className="font-black text-indigo-900">🫧 {score} popped</p>
        <div className="flex items-center gap-2">
          <div
            className="h-2 rounded-full bg-cyan-200 transition-all duration-1000"
            style={{ width: "80px" }}
          >
            <div
              className="h-full rounded-full bg-cyan-500 transition-all duration-1000"
              style={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
            />
          </div>
          <p className="min-w-[28px] text-right font-black text-cyan-700">{timeLeft}s</p>
        </div>
      </div>

      {/* Game area */}
      <div
        className="bubble-container relative overflow-hidden rounded-3xl border-2 border-cyan-200 bg-gradient-to-b from-sky-100 to-blue-50"
        style={{ height: "calc(100vh - 220px)", minHeight: "280px" }}
      >
        {/* Bubbles */}
        {bubbles.map((bubble) => (
          <button
            key={bubble.id}
            type="button"
            onPointerDown={(e) => popBubble(bubble, e)}
            className="absolute flex cursor-pointer items-center justify-center rounded-full border-2 border-white/60 shadow-lg transition-transform active:scale-90"
            style={{
              width: bubble.size,
              height: bubble.size,
              left: `${bubble.left}%`,
              backgroundColor: bubble.color,
              animation: `bubble-rise ${bubble.duration}ms linear forwards`,
              fontSize: bubble.size * 0.5,
              lineHeight: 1,
              zIndex: 10,
            }}
          >
            {bubble.emoji}
          </button>
        ))}

        {/* Burst effects */}
        {bursts.map((burst) => (
          <div
            key={burst.id}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: burst.x,
              top: burst.y,
              fontSize: 48,
              animation: "bubble-pop 0.5s ease-out forwards",
              zIndex: 20,
            }}
          >
            {burst.emoji}
          </div>
        ))}

        {/* Idle prompt */}
        {bubbles.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-lg font-bold text-cyan-400">Bubbles coming… 🫧</p>
          </div>
        )}
      </div>
    </div>
  );
}
