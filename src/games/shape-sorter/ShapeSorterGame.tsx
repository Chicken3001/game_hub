"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/Button";

type ShapeType = "circle" | "square" | "triangle" | "star";

const ALL_SHAPES: ShapeType[] = ["circle", "square", "triangle", "star"];

const CONFIG: Record<ShapeType, { color: string; label: string }> = {
  circle:   { color: "#FF6B6B", label: "Circle"   },
  square:   { color: "#4ECDC4", label: "Square"   },
  triangle: { color: "#95E77E", label: "Triangle" },
  star:     { color: "#FFD93D", label: "Star"     },
};

const TOTAL_SHAPES = 10;
const SHAPE_SIZE = 96;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeQueue(): ShapeType[] {
  // 2 of each (8) + 2 random extras = 10
  const base = [...ALL_SHAPES, ...ALL_SHAPES];
  const extras: ShapeType[] = [
    ALL_SHAPES[Math.floor(Math.random() * 4)],
    ALL_SHAPES[Math.floor(Math.random() * 4)],
  ];
  return shuffle([...base, ...extras]);
}

interface ShapeIconProps {
  type: ShapeType;
  color: string;
  size?: number;
  outline?: boolean;
}

function ShapeIcon({ type, color, size = 80, outline = false }: ShapeIconProps) {
  const solid = { fill: color };
  const stroked = {
    fill: "none",
    stroke: color,
    strokeWidth: 5,
    strokeLinejoin: "round" as const,
  };
  const p = outline ? stroked : solid;

  if (type === "circle") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={outline ? 43 : 47} {...p} />
      </svg>
    );
  }
  if (type === "square") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <rect
          x={outline ? 8 : 5}
          y={outline ? 8 : 5}
          width={outline ? 84 : 90}
          height={outline ? 84 : 90}
          rx="10"
          {...p}
        />
      </svg>
    );
  }
  if (type === "triangle") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <polygon points="50,8 94,90 6,90" {...p} />
      </svg>
    );
  }
  // star — 5-point star: alternating outer (r=45) and inner (r=18) points
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <polygon
        points="50,5 61,35 93,36 67,56 77,86 50,68 24,86 33,56 7,36 39,35"
        {...p}
      />
    </svg>
  );
}

export function ShapeSorterGame() {
  const [mounted, setMounted] = useState(false);
  const [queue, setQueue] = useState<ShapeType[]>([]);
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [shaking, setShaking] = useState(false);
  const [flashBin, setFlashBin] = useState<ShapeType | null>(null);
  const [gameWon, setGameWon] = useState(false);

  // Refs so event listeners always see current values without re-subscribing
  const draggingRef = useRef(false);
  const currentShapeRef = useRef<ShapeType>("circle");
  const binRefs = useRef<Partial<Record<ShapeType, HTMLDivElement>>>({});

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setQueue(makeQueue());
  }, []);

  const currentShape: ShapeType | undefined = queue[index];

  useEffect(() => {
    if (currentShape) currentShapeRef.current = currentShape;
  }, [currentShape]);

  const handleCorrect = useCallback((shape: ShapeType) => {
    draggingRef.current = false;
    setDragging(false);
    setFlashBin(shape);
    setTimeout(() => {
      setFlashBin(null);
      setIndex((prev) => {
        const next = prev + 1;
        if (next >= TOTAL_SHAPES) setGameWon(true);
        return next;
      });
    }, 500);
  }, []);

  const handleWrong = useCallback(() => {
    draggingRef.current = false;
    setDragging(false);
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  }, []);

  // Global pointer listeners — always mounted, guarded by draggingRef
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      setDragPos({ x: e.clientX, y: e.clientY });
    };

    const onUp = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      let matched = false;
      for (const shape of ALL_SHAPES) {
        const el = binRefs.current[shape];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (
          e.clientX >= r.left &&
          e.clientX <= r.right &&
          e.clientY >= r.top &&
          e.clientY <= r.bottom
        ) {
          matched = true;
          if (shape === currentShapeRef.current) handleCorrect(shape);
          else handleWrong();
          break;
        }
      }
      if (!matched) handleWrong();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [handleCorrect, handleWrong]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (shaking || flashBin) return;
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setDragPos({ x: e.clientX, y: e.clientY });
      draggingRef.current = true;
      setDragging(true);
    },
    [shaking, flashBin]
  );

  const reset = useCallback(() => {
    setQueue(makeQueue());
    setIndex(0);
    setDragging(false);
    draggingRef.current = false;
    setShaking(false);
    setFlashBin(null);
    setGameWon(false);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-xl font-bold text-purple-400">Getting ready… 🎮</p>
      </div>
    );
  }

  // Win screen
  if (gameWon) {
    return (
      <div
        className="rounded-3xl border-2 border-purple-300 bg-gradient-to-br from-purple-100 to-violet-100 p-8 text-center shadow-xl"
        style={{ animation: "pop-in 0.4s ease-out" }}
      >
        <div
          className="text-7xl leading-none"
          style={{ animation: "float 2s ease-in-out infinite" }}
        >
          🎉
        </div>
        <p className="mt-4 text-3xl font-black text-indigo-900">
          You sorted them all!
        </p>
        <p className="mt-2 text-lg font-bold text-purple-600">
          Amazing job! ⭐⭐⭐
        </p>
        <Button onClick={reset} size="lg" className="mt-6">
          Play Again! 🔄
        </Button>
      </div>
    );
  }

  if (!currentShape) return null;

  const config = CONFIG[currentShape];

  const shapeStyle: React.CSSProperties = dragging
    ? {
        position: "fixed",
        left: dragPos.x - dragOffset.x,
        top: dragPos.y - dragOffset.y,
        width: SHAPE_SIZE,
        height: SHAPE_SIZE,
        zIndex: 50,
        touchAction: "none",
        filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.22))",
        cursor: "grabbing",
      }
    : {
        width: SHAPE_SIZE,
        height: SHAPE_SIZE,
        cursor: "grab",
        touchAction: "none",
        animation: shaking
          ? "shake 0.4s ease-in-out"
          : "card-appear 0.35s ease-out",
      };

  return (
    <div className="flex flex-col gap-5 select-none">
      {/* Progress bar */}
      <div className="flex items-center justify-between rounded-2xl border border-purple-100 bg-white px-4 py-2.5 shadow">
        <span className="text-sm font-bold text-indigo-600">Shapes sorted</span>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_SHAPES }).map((_, i) => (
              <div
                key={i}
                className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${
                  i < index ? "bg-purple-500" : "bg-purple-100"
                }`}
              />
            ))}
          </div>
          <span className="min-w-[36px] text-right text-sm font-black text-purple-600">
            {index}/{TOTAL_SHAPES}
          </span>
        </div>
      </div>

      {/* Drop zone — where the current shape lives */}
      <div className="relative flex h-44 items-center justify-center rounded-3xl border-2 border-dashed border-purple-200 bg-white shadow-md">
        <p className="absolute top-2.5 left-0 right-0 text-center text-xs font-bold uppercase tracking-wide text-purple-300 select-none">
          Drag to the right bin ↓
        </p>

        {/* Ghost placeholder shown while dragging */}
        {dragging && (
          <div style={{ width: SHAPE_SIZE, height: SHAPE_SIZE, opacity: 0.2 }}>
            <ShapeIcon type={currentShape} color={config.color} size={SHAPE_SIZE} />
          </div>
        )}

        {/* The draggable shape (hidden while flash animation plays) */}
        {!flashBin && (
          <div
            key={index} // remount on new shape → restarts card-appear animation
            onPointerDown={onPointerDown}
            style={shapeStyle}
          >
            <ShapeIcon type={currentShape} color={config.color} size={SHAPE_SIZE} />
          </div>
        )}
      </div>

      {/* Bins */}
      <div className="grid grid-cols-4 gap-2">
        {ALL_SHAPES.map((binShape) => {
          const bc = CONFIG[binShape];
          const isFlashing = flashBin === binShape;
          return (
            <div
              key={binShape}
              ref={(el) => {
                if (el) binRefs.current[binShape] = el;
              }}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 py-3 px-1 transition-all duration-200 ${
                isFlashing
                  ? "scale-[1.08] border-green-400 bg-green-50"
                  : "border-purple-200 bg-white"
              }`}
              style={
                isFlashing
                  ? { boxShadow: "0 0 0 4px rgba(134,239,172,0.5)" }
                  : undefined
              }
            >
              <ShapeIcon type={binShape} color={bc.color} size={48} outline />
              <span className="text-center text-[11px] font-black leading-none text-indigo-700">
                {bc.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
