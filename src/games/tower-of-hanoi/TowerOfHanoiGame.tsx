"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/Button";

type PegIndex = 0 | 1 | 2;
type Pegs = [number[], number[], number[]];

const MIN_RINGS = 3;
const MAX_RINGS = 8;
const RING_HEIGHT_PX = 22;
const RING_MIN_WIDTH_PCT = 26; // smallest ring width as % of peg column
const RING_MAX_WIDTH_PCT = 92; // largest ring width as % of peg column

function optimalMoves(n: number): number {
  return Math.pow(2, n) - 1;
}

function initialPegs(n: number): Pegs {
  const first: number[] = [];
  for (let size = n; size >= 1; size--) first.push(size);
  return [first, [], []];
}

function ringWidthPct(size: number, total: number): number {
  if (total <= 1) return RING_MAX_WIDTH_PCT;
  const t = (size - 1) / (total - 1);
  return RING_MIN_WIDTH_PCT + t * (RING_MAX_WIDTH_PCT - RING_MIN_WIDTH_PCT);
}

function ringColor(size: number, total: number): string {
  const t = (size - 1) / Math.max(total - 1, 1);
  const hue = 12 + t * 300; // sweep through warm → cool
  return `hsl(${hue} 78% 58%)`;
}

export function TowerOfHanoiGame() {
  const [phase, setPhase] = useState<"idle" | "playing" | "won">("idle");
  const [ringCount, setRingCount] = useState(3);
  const [pegs, setPegs] = useState<Pegs>(() => initialPegs(3));
  const [selectedPeg, setSelectedPeg] = useState<PegIndex | null>(null);
  const [moves, setMoves] = useState(0);
  const [errorPeg, setErrorPeg] = useState<PegIndex | null>(null);

  const optimal = useMemo(() => optimalMoves(ringCount), [ringCount]);

  const startGame = useCallback((n: number) => {
    setRingCount(n);
    setPegs(initialPegs(n));
    setMoves(0);
    setSelectedPeg(null);
    setErrorPeg(null);
    setPhase("playing");
  }, []);

  const restart = useCallback(() => {
    setPegs(initialPegs(ringCount));
    setMoves(0);
    setSelectedPeg(null);
    setErrorPeg(null);
    setPhase("playing");
  }, [ringCount]);

  const handlePegTap = useCallback(
    (pegId: PegIndex) => {
      if (phase !== "playing") return;

      if (selectedPeg === null) {
        if (pegs[pegId].length === 0) return;
        setSelectedPeg(pegId);
        return;
      }

      if (selectedPeg === pegId) {
        setSelectedPeg(null);
        return;
      }

      const source = pegs[selectedPeg];
      const target = pegs[pegId];
      const ring = source[source.length - 1];
      const topOfTarget = target.length > 0 ? target[target.length - 1] : Infinity;

      if (ring < topOfTarget) {
        const next = pegs.map((p) => [...p]) as Pegs;
        next[selectedPeg].pop();
        next[pegId].push(ring);
        setPegs(next);
        setMoves((m) => m + 1);
        setSelectedPeg(null);
        if (next[2].length === ringCount) {
          setPhase("won");
        }
      } else {
        setErrorPeg(pegId);
        setTimeout(() => setErrorPeg((cur) => (cur === pegId ? null : cur)), 400);
      }
    },
    [phase, selectedPeg, pegs, ringCount]
  );

  // --- TITLE SCREEN ---
  if (phase === "idle") {
    const sizes = Array.from({ length: MAX_RINGS - MIN_RINGS + 1 }, (_, i) => MIN_RINGS + i);
    return (
      <div className="flex flex-col items-center gap-5 rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-sky-50 to-violet-50 p-6 text-center shadow-md">
        <div className="text-6xl leading-none" style={{ animation: "float 2s ease-in-out infinite" }}>
          🗼
        </div>
        <div>
          <p className="text-2xl font-black text-indigo-800">Tower of Hanoi</p>
          <p className="mt-1 text-sm font-bold text-indigo-600">
            Move all the rings to the right peg.
            <br />
            Never put a big ring on a small one!
          </p>
        </div>

        <div className="w-full">
          <p className="mb-2 text-sm font-bold text-indigo-700">Pick your puzzle size:</p>
          <div className="grid grid-cols-3 gap-2">
            {sizes.map((n) => {
              const label =
                n === MIN_RINGS ? "Easiest" : n === MAX_RINGS ? "Hardest" : null;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => startGame(n)}
                  className="rounded-2xl border-2 border-indigo-200 bg-white px-2 py-3 font-black text-indigo-800 shadow-sm transition-transform hover:scale-105 hover:border-indigo-400 hover:bg-indigo-50 active:scale-95"
                >
                  <div className="text-lg leading-tight">{n}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-indigo-500">
                    rings
                  </div>
                  <div className="mt-1 text-xs font-bold text-indigo-500">
                    {optimalMoves(n)} moves
                  </div>
                  {label && (
                    <div className="mt-0.5 text-[10px] font-black text-orange-500">{label}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- WON SCREEN ---
  if (phase === "won") {
    const perfect = moves === optimal;
    return (
      <div
        className="rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-100 via-pink-100 to-violet-100 p-8 text-center shadow-lg"
        style={{ animation: "pop-in 0.4s ease-out" }}
      >
        <div
          className="text-7xl leading-none"
          style={{ animation: "celebrate-bounce 0.8s ease-in-out infinite" }}
        >
          🏆
        </div>
        <p className="mt-4 text-3xl font-black text-violet-800">You did it!</p>
        <p className="mt-2 text-lg font-bold text-violet-700">
          Solved in <span className="text-orange-500">{moves}</span> moves
        </p>
        <p className="mt-1 text-sm font-bold text-violet-500">Best possible: {optimal}</p>
        {perfect && (
          <p className="mt-2 text-base font-black text-amber-600">Perfect! 🌟</p>
        )}
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button onClick={restart} size="lg">
            Play again! 🔄
          </Button>
          <Button onClick={() => setPhase("idle")} variant="ghost" size="sm">
            Change size
          </Button>
        </div>
      </div>
    );
  }

  // --- ACTIVE GAMEPLAY ---
  const towerHeight = MAX_RINGS * RING_HEIGHT_PX + 70; // room for lifted ring + base

  return (
    <div className="flex flex-col gap-3">
      {/* Stats bar */}
      <div className="flex items-center justify-between rounded-2xl border-2 border-indigo-100 bg-white px-4 py-2 shadow-sm">
        <p className="font-black text-indigo-900">
          Moves: <span className="text-orange-500">{moves}</span>
        </p>
        <p className="text-sm font-bold text-indigo-600">
          {ringCount} rings · best {optimal}
        </p>
      </div>

      {/* Tower area */}
      <div
        className="relative rounded-3xl border-2 border-indigo-200 bg-gradient-to-b from-sky-50 to-violet-50 p-3 shadow-md"
        style={{ height: towerHeight }}
      >
        <div className="absolute inset-x-3 top-3 bottom-12 grid grid-cols-3 gap-2">
          {([0, 1, 2] as PegIndex[]).map((pegId) => {
            const stack = pegs[pegId];
            const isSelected = selectedPeg === pegId;
            const isError = errorPeg === pegId;
            const lifted = isSelected ? stack[stack.length - 1] : null;
            const visibleStack = isSelected ? stack.slice(0, -1) : stack;
            return (
              <button
                key={pegId}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  handlePegTap(pegId);
                }}
                className={`relative flex h-full cursor-pointer flex-col items-center justify-end rounded-2xl transition-colors ${
                  isSelected ? "bg-indigo-100/60" : "bg-transparent"
                } hover:bg-indigo-100/40`}
                style={{
                  animation: isError ? "shake 0.4s ease-in-out" : undefined,
                }}
                aria-label={`Peg ${pegId + 1}`}
              >
                {/* Peg post */}
                <div
                  className="absolute bottom-0 w-2 rounded-t-md bg-indigo-300"
                  style={{ height: "100%" }}
                />

                {/* Lifted ring */}
                {lifted !== null && (
                  <div
                    className="absolute top-1 rounded-full border-2 border-white/70 shadow-lg"
                    style={{
                      height: RING_HEIGHT_PX,
                      width: `${ringWidthPct(lifted, ringCount)}%`,
                      backgroundColor: ringColor(lifted, ringCount),
                      animation: "float 1.4s ease-in-out infinite",
                    }}
                  />
                )}

                {/* Stacked rings */}
                <div className="relative z-10 flex w-full flex-col-reverse items-center">
                  {visibleStack.map((size, idx) => (
                    <div
                      key={`${pegId}-${idx}-${size}`}
                      className="rounded-full border-2 border-white/70 shadow-md"
                      style={{
                        height: RING_HEIGHT_PX,
                        width: `${ringWidthPct(size, ringCount)}%`,
                        backgroundColor: ringColor(size, ringCount),
                      }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Base bar */}
        <div className="absolute inset-x-3 bottom-3 h-3 rounded-full bg-gradient-to-r from-indigo-300 via-violet-300 to-pink-300 shadow-inner" />
      </div>

      {/* Hint */}
      <p className="text-center text-xs font-bold text-indigo-500">
        {selectedPeg === null
          ? "Tap a peg to pick up its top ring."
          : "Tap another peg to drop it there."}
      </p>

      {/* Controls */}
      <div className="flex justify-center gap-2">
        <Button onClick={restart} variant="secondary" size="sm">
          Restart 🔄
        </Button>
        <Button onClick={() => setPhase("idle")} variant="ghost" size="sm">
          Change size
        </Button>
      </div>
    </div>
  );
}
