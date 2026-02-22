"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { AnimalSet } from "./data";
import { getPairColor } from "./data";

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface MatchedPair {
  leftIdx: number;
  rightIdx: number;
  color: string;
}

export function AnimalMatchGame({ set }: { set: AnimalSet }) {
  const animals = set.animals;
  const [leftCards, setLeftCards] = useState<typeof animals>([]);
  const [rightCards, setRightCards] = useState<typeof animals>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLeftCards(shuffle(animals));
    setRightCards(shuffle(animals));
    setMounted(true);
  }, [animals]);
  const [selected, setSelected] = useState<{ side: "left" | "right"; index: number } | null>(null);
  const [matched, setMatched] = useState<MatchedPair[]>([]);
  const [tries, setTries] = useState(0);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number; color: string }[]>([]);
  const [gameWon, setGameWon] = useState(false);
  const leftRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rightRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const justMatchedRef = useRef(false);

  const getCenter = useCallback((el: HTMLButtonElement | null) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const container = containerRef.current;
    if (!container) return null;
    const cr = container.getBoundingClientRect();
    return {
      x: r.left - cr.left + r.width / 2,
      y: r.top - cr.top + r.height / 2,
    };
  }, []);

  const tryMatch = useCallback(
    (firstSide: "left" | "right", firstIdx: number, secondSide: "left" | "right", secondIdx: number) => {
      const firstCards = firstSide === "left" ? leftCards : rightCards;
      const secondCards = secondSide === "left" ? leftCards : rightCards;
      const matchName = firstSide !== secondSide && firstCards[firstIdx].name === secondCards[secondIdx].name;
      if (!matchName) return;

      const leftIdx = firstSide === "left" ? firstIdx : secondIdx;
      const rightIdx = firstSide === "right" ? firstIdx : secondIdx;
      const color = getPairColor(matched.length);
      const leftEl = leftRefs.current[leftIdx];
      const rightEl = rightRefs.current[rightIdx];
      const p1 = getCenter(leftEl ?? null);
      const p2 = getCenter(rightEl ?? null);
      if (p1 && p2) {
        setLines((prev) => [...prev, { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, color }]);
      }
      setMatched((prev) => {
        const next = [...prev, { leftIdx, rightIdx, color }];
        if (next.length === animals.length) setTimeout(() => setGameWon(true), 500);
        return next;
      });
    },
    [leftCards, rightCards, matched.length, animals.length, getCenter]
  );

  const handleCardTap = useCallback(
    (side: "left" | "right", index: number) => {
      const cards = side === "left" ? leftCards : rightCards;
      const card = cards[index];
      const isMatched = matched.some(
        (m) => (side === "left" && m.leftIdx === index) || (side === "right" && m.rightIdx === index)
      );
      if (isMatched) return;

      if (!selected) {
        setSelected({ side, index });
        setPointer(null);
        return;
      }

      setTries((t) => t + 1);
      if (selected.side === side && selected.index === index) {
        setSelected(null);
        setPointer(null);
        return;
      }

      justMatchedRef.current = true;
      tryMatch(selected.side, selected.index, side, index);
      setSelected(null);
      setPointer(null);
    },
    [selected, leftCards, rightCards, matched, tryMatch]
  );

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selected) return;
    const onMove = (e: PointerEvent) => setPointer({ x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      setPointer(null);
      if (justMatchedRef.current) {
        justMatchedRef.current = false;
        setSelected(null);
        return;
      }
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || !containerRef.current?.contains(el)) {
        setSelected(null);
        return;
      }
      const btn = el.closest("button[data-side][data-index]");
      if (!btn) {
        setSelected(null);
        return;
      }
      const side = btn.getAttribute("data-side") as "left" | "right";
      const index = parseInt(btn.getAttribute("data-index") ?? "-1", 10);
      if (side && index >= 0 && (selected.side !== side || selected.index !== index)) {
        setTries((t) => t + 1);
        tryMatch(selected.side, selected.index, side, index);
      }
      setSelected(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [selected, tryMatch]);

  const selectedCenter = selected
    ? getCenter(selected.side === "left" ? leftRefs.current[selected.index] ?? null : rightRefs.current[selected.index] ?? null)
    : null;

  const reset = () => {
    setSelected(null);
    setPointer(null);
    setMatched([]);
    setTries(0);
    setLines([]);
    setGameWon(false);
    setLeftCards(shuffle(animals));
    setRightCards(shuffle(animals));
    leftRefs.current = [];
    rightRefs.current = [];
  };

  if (!mounted || leftCards.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="font-medium text-sky-600">Getting ready…</p>
      </div>
    );
  }

  if (gameWon) {
    return (
      <Card className="border-emerald-300 bg-emerald-50 p-8 text-center">
        <div className="text-5xl">🎉</div>
        <p className="mt-4 text-2xl font-bold text-emerald-800">You did it!</p>
        <p className="mt-2 text-emerald-700 font-medium">
          You matched them all in {tries} {tries === 1 ? "try" : "tries"}!
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Play again</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="relative space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-bold text-sky-800">
          Matched: {matched.length} / {animals.length}
        </p>
        <p className="font-bold text-sky-800">Tries: {tries}</p>
      </div>

      <div ref={containerRef} className="relative flex min-h-[320px] justify-center gap-6 overflow-visible px-2 py-4">
        <svg
          ref={svgRef}
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          style={{ zIndex: 5 }}
        >
          {lines.map((line, i) => (
            <line
              key={i}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={line.color}
              strokeWidth="4"
              strokeLinecap="round"
            />
          ))}
          {selectedCenter && pointer && svgRef.current && (() => {
            const pt = svgRef.current.createSVGPoint();
            pt.x = pointer.x;
            pt.y = pointer.y;
            const p = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
            return (
              <line
                x1={selectedCenter.x}
                y1={selectedCenter.y}
                x2={p.x}
                y2={p.y}
                stroke="#94a3b8"
                strokeWidth="3"
                strokeDasharray="8 6"
                strokeLinecap="round"
              />
            );
          })()}
        </svg>

        <div className="flex flex-col gap-3">
          {leftCards.map((animal, i) => {
            const isMatched = matched.some((m) => m.leftIdx === i);
            const isSelected = selected?.side === "left" && selected?.index === i;
            return (
              <button
                key={`left-${i}-${animal.name}`}
                ref={(el) => { leftRefs.current[i] = el; }}
                type="button"
                data-side="left"
                data-index={i}
                onPointerDown={() => handleCardTap("left", i)}
                className="flex h-20 w-24 flex-col items-center justify-center rounded-2xl border-2 bg-white text-2xl shadow-md transition-all hover:scale-105 disabled:pointer-events-none sm:h-24 sm:w-28"
                style={{
                  borderColor: isMatched ? matched.find((m) => m.leftIdx === i)?.color : isSelected ? "#f59e0b" : "#e2e8f0",
                  opacity: isMatched ? 0.7 : 1,
                }}
              >
                <span>{animal.emoji}</span>
                <span className="text-xs font-bold sm:text-sm" style={{ color: animal.color }}>
                  {animal.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3">
          {rightCards.map((animal, i) => {
            const isMatched = matched.some((m) => m.rightIdx === i);
            const isSelected = selected?.side === "right" && selected?.index === i;
            return (
              <button
                key={`right-${i}-${animal.name}`}
                ref={(el) => { rightRefs.current[i] = el; }}
                type="button"
                data-side="right"
                data-index={i}
                onPointerDown={() => handleCardTap("right", i)}
                className="flex h-20 w-24 flex-col items-center justify-center rounded-2xl border-2 bg-white text-2xl shadow-md transition-all hover:scale-105 disabled:pointer-events-none sm:h-24 sm:w-28"
                style={{
                  borderColor: isMatched ? matched.find((m) => m.rightIdx === i)?.color : isSelected ? "#f59e0b" : "#e2e8f0",
                  opacity: isMatched ? 0.7 : 1,
                }}
              >
                <span>{animal.emoji}</span>
                <span className="text-xs font-bold sm:text-sm" style={{ color: animal.color }}>
                  {animal.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Button variant="secondary" size="sm" onClick={reset}>
        Shuffle & play again
      </Button>
    </div>
  );
}
