"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
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

interface WrongPair {
  side1: "left" | "right";
  idx1: number;
  side2: "left" | "right";
  idx2: number;
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
  const [selectedCenter, setSelectedCenter] = useState<{ x: number; y: number } | null>(null);
  const [matched, setMatched] = useState<MatchedPair[]>([]);
  const [wrongPair, setWrongPair] = useState<WrongPair | null>(null);
  const [tries, setTries] = useState(0);
  const [pointerLocal, setPointerLocal] = useState<{ x: number; y: number } | null>(null);
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number; color: string }[]>([]);
  const [gameWon, setGameWon] = useState(false);

  const leftRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rightRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
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
    (
      firstSide: "left" | "right",
      firstIdx: number,
      secondSide: "left" | "right",
      secondIdx: number
    ) => {
      const firstCards = firstSide === "left" ? leftCards : rightCards;
      const secondCards = secondSide === "left" ? leftCards : rightCards;
      const isMatch =
        firstSide !== secondSide &&
        firstCards[firstIdx].name === secondCards[secondIdx].name;

      if (!isMatch) {
        // Flash wrong pair
        setWrongPair({ side1: firstSide, idx1: firstIdx, side2: secondSide, idx2: secondIdx });
        setTimeout(() => setWrongPair(null), 600);
        return;
      }

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
      const isMatched = matched.some(
        (m) =>
          (side === "left" && m.leftIdx === index) ||
          (side === "right" && m.rightIdx === index)
      );
      if (isMatched) return;

      // Nothing selected yet → select this card
      // Reading refs here is fine — this is an event handler, not render
      if (!selected) {
        const el = side === "left" ? leftRefs.current[index] ?? null : rightRefs.current[index] ?? null;
        setSelectedCenter(getCenter(el));
        setSelected({ side, index });
        setPointerLocal(null);
        return;
      }

      // Tapped the same card again → deselect
      if (selected.side === side && selected.index === index) {
        setSelected(null);
        setSelectedCenter(null);
        setPointerLocal(null);
        return;
      }

      // Tapped a different card → attempt match
      justMatchedRef.current = true;
      setTries((t) => t + 1);
      tryMatch(selected.side, selected.index, side, index);
      setSelected(null);
      setSelectedCenter(null);
      setPointerLocal(null);
    },
    [selected, matched, tryMatch, getCenter]
  );

  useEffect(() => {
    if (!selected) return;

    const onMove = (e: PointerEvent) => {
      if (containerRef.current) {
        const cr = containerRef.current.getBoundingClientRect();
        setPointerLocal({ x: e.clientX - cr.left, y: e.clientY - cr.top });
      }
    };

    const onUp = (e: PointerEvent) => {
      setPointerLocal(null);

      if (justMatchedRef.current) {
        // handleCardTap already handled the match and cleared selection
        justMatchedRef.current = false;
        return;
      }

      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || !containerRef.current?.contains(el)) {
        // Released outside the game area → deselect
        setSelected(null);
        return;
      }

      const btn = el.closest("button[data-side][data-index]");
      if (!btn) {
        // Released on non-card area → deselect
        setSelected(null);
        return;
      }

      const side = btn.getAttribute("data-side") as "left" | "right";
      const index = parseInt(btn.getAttribute("data-index") ?? "-1", 10);

      if (side && index >= 0) {
        if (selected.side !== side || selected.index !== index) {
          // Dragged to a different card → match attempt
          setTries((t) => t + 1);
          tryMatch(selected.side, selected.index, side, index);
          setSelected(null);
        }
        // Same card: was a simple tap to select — keep the selection alive
      } else {
        setSelected(null);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [selected, tryMatch]);

  const reset = () => {
    setSelected(null);
    setSelectedCenter(null);
    setPointerLocal(null);
    setMatched([]);
    setWrongPair(null);
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
        <p className="text-xl font-bold text-violet-400">Getting ready… 🎮</p>
      </div>
    );
  }

  if (gameWon) {
    return (
      <div
        className="rounded-3xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-100 to-teal-100 p-8 text-center shadow-lg"
        style={{ animation: "pop-in 0.4s ease-out" }}
      >
        <div className="text-7xl leading-none" style={{ animation: "float 2s ease-in-out infinite" }}>
          🎉
        </div>
        <p className="mt-4 text-3xl font-black text-emerald-800">Amazing!</p>
        <p className="mt-2 text-lg font-bold text-emerald-700">
          You matched them all in{" "}
          <span className="font-black text-orange-500">{tries}</span>{" "}
          {tries === 1 ? "try" : "tries"}!
        </p>
        <Button onClick={reset} size="lg" className="mt-6">
          Play again! 🔄
        </Button>
      </div>
    );
  }

  const isWrong = (side: "left" | "right", index: number) =>
    wrongPair !== null &&
    ((wrongPair.side1 === side && wrongPair.idx1 === index) ||
      (wrongPair.side2 === side && wrongPair.idx2 === index));

  const renderCard = (
    side: "left" | "right",
    animal: (typeof animals)[0],
    i: number,
    refs: React.MutableRefObject<(HTMLButtonElement | null)[]>
  ) => {
    const isMatched = matched.some(
      (m) => (side === "left" && m.leftIdx === i) || (side === "right" && m.rightIdx === i)
    );
    const isSelected = selected?.side === side && selected?.index === i;
    const matchColor = isMatched
      ? matched.find((m) => (side === "left" && m.leftIdx === i) || (side === "right" && m.rightIdx === i))?.color
      : undefined;
    const wrong = isWrong(side, i);

    return (
      <button
        key={`${side}-${i}-${animal.name}`}
        ref={(el) => {
          refs.current[i] = el;
        }}
        type="button"
        data-side={side}
        data-index={i}
        onPointerDown={() => handleCardTap(side, i)}
        disabled={isMatched}
        className="flex h-16 w-20 flex-col items-center justify-center rounded-2xl border-[3px] bg-white transition-all duration-150 disabled:pointer-events-none sm:h-20 sm:w-24"
        style={{
          borderColor: isMatched
            ? matchColor
            : isSelected
            ? "#fbbf24"
            : wrong
            ? "#ef4444"
            : "#e0d9ff",
          backgroundColor: isMatched
            ? `${matchColor}22`
            : wrong
            ? "#fee2e2"
            : isSelected
            ? "#fef9c3"
            : "#ffffff",
          transform: isSelected ? "scale(1.1)" : "scale(1)",
          animation: isSelected
            ? "pulse-ring 1.4s ease-in-out infinite"
            : wrong
            ? "wrong-flash 0.6s ease-in-out"
            : undefined,
          boxShadow: isMatched
            ? `0 0 0 2px ${matchColor}55`
            : isSelected
            ? "0 0 0 4px rgba(251,191,36,0.4)"
            : "0 2px 12px rgba(139,92,246,0.1)",
        }}
      >
        <span className="text-2xl leading-none sm:text-3xl">{animal.emoji}</span>
        <span
          className="mt-0.5 text-[10px] font-black sm:text-xs"
          style={{ color: isMatched ? matchColor : animal.color }}
        >
          {animal.name}
        </span>
        {isMatched && (
          <span className="text-[10px] font-black text-emerald-600">✓</span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center justify-between rounded-2xl border-2 border-violet-100 bg-white px-4 py-2 shadow-sm">
        <p className="font-black text-indigo-900">
          ✅ {matched.length}/{animals.length} &nbsp;·&nbsp; 🎯 {tries} tries
        </p>
        <Button variant="secondary" size="sm" onClick={reset}>
          Shuffle 🔄
        </Button>
      </div>

      {selected && (
        <p className="text-center text-sm font-bold text-amber-600">
          ✨ {selected.side === "left" ? leftCards[selected.index].name : rightCards[selected.index].name} selected — now tap its match!
        </p>
      )}

      {/* Game area */}
      <div
        ref={containerRef}
        className="relative flex justify-center gap-3 overflow-visible px-2 py-2 sm:gap-6"
      >
        {/* SVG lines */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          style={{ zIndex: 5 }}
        >
          <defs>
            <filter id="line-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Matched lines */}
          {lines.map((line, i) => (
            <line
              key={i}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={line.color}
              strokeWidth="6"
              strokeLinecap="round"
              filter="url(#line-glow)"
            />
          ))}

          {/* Drag preview line — coords are already container-relative */}
          {selectedCenter && pointerLocal && (
            <line
              x1={selectedCenter.x}
              y1={selectedCenter.y}
              x2={pointerLocal.x}
              y2={pointerLocal.y}
              stroke="#fbbf24"
              strokeWidth="4"
              strokeDasharray="10 7"
              strokeLinecap="round"
              opacity="0.8"
            />
          )}
        </svg>

        {/* Left column */}
        <div className="flex flex-col gap-2">
          {/* eslint-disable-next-line react-hooks/refs */}
          {leftCards.map((animal, i) => renderCard("left", animal, i, leftRefs))}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-2">
          {/* eslint-disable-next-line react-hooks/refs */}
          {rightCards.map((animal, i) => renderCard("right", animal, i, rightRefs))}
        </div>
      </div>
    </div>
  );
}
