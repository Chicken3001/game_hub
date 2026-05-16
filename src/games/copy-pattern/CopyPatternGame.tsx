"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/Button";

type Difficulty = "easy" | "medium" | "hard";
type Phase = "idle" | "watch" | "input" | "mistake" | "won";

const TARGET_LENGTH: Record<Difficulty, number> = {
  easy: 3,
  medium: 5,
  hard: 7,
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

interface PadDef {
  id: number;
  base: string;
  lit: string;
  emoji: string;
  freq: number;
}

// Tailwind classes are literal strings so the JIT keeps them.
const PADS: PadDef[] = [
  { id: 0, base: "bg-red-400",    lit: "bg-red-200",    emoji: "🦁", freq: 261.63 },
  { id: 1, base: "bg-sky-400",    lit: "bg-sky-200",    emoji: "🐠", freq: 329.63 },
  { id: 2, base: "bg-yellow-400", lit: "bg-yellow-200", emoji: "🐤", freq: 392.0 },
  { id: 3, base: "bg-green-400",  lit: "bg-green-200",  emoji: "🐸", freq: 523.25 },
];

const PAD_LIT_MS = 550;
const PAD_GAP_MS = 250;
const START_DELAY_MS = 600;
const MISTAKE_DELAY_MS = 1100;
const NEXT_ROUND_DELAY_MS = 650;
const SOUND_STORAGE_KEY = "copy-pattern:sound";

function randomPad(): number {
  return Math.floor(Math.random() * PADS.length);
}

export function CopyPatternGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [sequence, setSequence] = useState<number[]>([]);
  const [userIndex, setUserIndex] = useState(0);
  const [litPad, setLitPad] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState(true);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(soundOn);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  // Restore sound preference (mount-only sync from localStorage; default keeps SSR safe)
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SOUND_STORAGE_KEY);
      if (stored === "off") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSoundOn(false);
      }
    } catch {
      // ignore
    }
  }, []);

  const clearTimers = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
  }, []);

  const getAudioCtx = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!audioCtxRef.current) {
      try {
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Ctx) return null;
        audioCtxRef.current = new Ctx();
      } catch {
        return null;
      }
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback(
    (freq: number, duration = 0.32) => {
      if (!soundOnRef.current) return;
      const ctx = getAudioCtx();
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    },
    [getAudioCtx]
  );

  const playSadTone = useCallback(() => {
    if (!soundOnRef.current) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.exponentialRampToValueAtTime(165, now + 0.45);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }, [getAudioCtx]);

  const playWinChime = useCallback(() => {
    if (!soundOnRef.current) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + idx * 0.13;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  }, [getAudioCtx]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  // Play the sequence whenever we enter "watch" phase
  useEffect(() => {
    if (phase !== "watch" || sequence.length === 0) return;
    const localTimers: ReturnType<typeof setTimeout>[] = [];

    sequence.forEach((padId, idx) => {
      const onAt = START_DELAY_MS + idx * (PAD_LIT_MS + PAD_GAP_MS);
      localTimers.push(
        setTimeout(() => {
          setLitPad(padId);
          playTone(PADS[padId].freq);
        }, onAt)
      );
      localTimers.push(
        setTimeout(() => setLitPad((cur) => (cur === padId ? null : cur)), onAt + PAD_LIT_MS)
      );
    });

    localTimers.push(
      setTimeout(() => {
        setUserIndex(0);
        setLitPad(null);
        setPhase("input");
      }, START_DELAY_MS + sequence.length * (PAD_LIT_MS + PAD_GAP_MS))
    );

    timeoutsRef.current.push(...localTimers);
    return () => localTimers.forEach(clearTimeout);
  }, [phase, sequence, playTone]);

  const persistSound = useCallback((on: boolean) => {
    setSoundOn(on);
    try {
      window.localStorage.setItem(SOUND_STORAGE_KEY, on ? "on" : "off");
    } catch {
      // ignore
    }
  }, []);

  const startGame = useCallback(
    (diff: Difficulty) => {
      // First user gesture — safe to init AudioContext
      getAudioCtx();
      clearTimers();
      setDifficulty(diff);
      setSequence([randomPad()]);
      setUserIndex(0);
      setLitPad(null);
      setPhase("watch");
    },
    [clearTimers, getAudioCtx]
  );

  const goToTitle = useCallback(() => {
    clearTimers();
    setSequence([]);
    setUserIndex(0);
    setLitPad(null);
    setPhase("idle");
  }, [clearTimers]);

  const handlePadTap = useCallback(
    (padId: number) => {
      if (phase !== "input") return;
      const expected = sequence[userIndex];

      // Always flash the tapped pad for feedback
      setLitPad(padId);
      playTone(PADS[padId].freq);
      const padFlashId = setTimeout(
        () => setLitPad((cur) => (cur === padId ? null : cur)),
        PAD_LIT_MS
      );
      timeoutsRef.current.push(padFlashId);

      if (padId !== expected) {
        setPhase("mistake");
        playSadTone();
        schedule(() => {
          setUserIndex(0);
          setPhase("watch");
        }, MISTAKE_DELAY_MS);
        return;
      }

      const newIndex = userIndex + 1;
      setUserIndex(newIndex);

      if (newIndex === sequence.length) {
        const target = TARGET_LENGTH[difficulty];
        if (sequence.length >= target) {
          schedule(() => {
            playWinChime();
            setPhase("won");
          }, NEXT_ROUND_DELAY_MS);
        } else {
          schedule(() => {
            setSequence((prev) => [...prev, randomPad()]);
            setPhase("watch");
          }, NEXT_ROUND_DELAY_MS);
        }
      }
    },
    [phase, sequence, userIndex, difficulty, playTone, playSadTone, playWinChime, schedule]
  );

  const target = TARGET_LENGTH[difficulty];

  // --- WON SCREEN ---
  if (phase === "won") {
    return (
      <div
        className="rounded-3xl border-2 border-yellow-300 bg-gradient-to-br from-yellow-100 via-pink-100 to-violet-100 p-8 text-center shadow-lg"
        style={{ animation: "pop-in 0.4s ease-out" }}
      >
        <div
          className="text-7xl leading-none"
          style={{ animation: "celebrate-bounce 0.8s ease-in-out infinite" }}
        >
          🎉
        </div>
        <p className="mt-4 text-3xl font-black text-violet-800">You did it!</p>
        <p className="mt-2 text-lg font-bold text-violet-700">
          You copied a {target}-step pattern!
        </p>
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button onClick={() => startGame(difficulty)} size="lg">
            Play again! 🔄
          </Button>
          <Button onClick={goToTitle} variant="ghost" size="sm">
            Change difficulty
          </Button>
        </div>
      </div>
    );
  }

  // --- TITLE SCREEN ---
  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center gap-5 rounded-3xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-pink-50 p-6 text-center shadow-md">
        <div className="text-6xl leading-none" style={{ animation: "float 2s ease-in-out infinite" }}>
          🎵
        </div>
        <div>
          <p className="text-2xl font-black text-violet-800">Copy the Pattern!</p>
          <p className="mt-1 text-sm font-bold text-violet-600">
            Watch which animals light up,
            <br />
            then tap them in the same order.
          </p>
        </div>

        {/* Mini pad preview */}
        <div className="grid grid-cols-2 gap-2">
          {PADS.map((pad) => (
            <div
              key={pad.id}
              className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-md ${pad.base}`}
            >
              {pad.emoji}
            </div>
          ))}
        </div>

        <div className="w-full">
          <p className="mb-2 text-sm font-bold text-violet-700">Pick a level:</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(TARGET_LENGTH) as Difficulty[]).map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => startGame(diff)}
                className="rounded-2xl border-2 border-violet-200 bg-white px-2 py-3 font-black text-violet-800 shadow-sm transition-transform hover:scale-105 hover:border-violet-400 hover:bg-violet-50 active:scale-95"
              >
                <div className="text-base">{DIFFICULTY_LABEL[diff]}</div>
                <div className="text-xs font-bold text-violet-500">
                  {TARGET_LENGTH[diff]} steps
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => persistSound(!soundOn)}
          className="mt-1 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-violet-700 shadow-sm transition-colors hover:bg-violet-50"
          aria-pressed={soundOn}
          aria-label={soundOn ? "Mute sound" : "Unmute sound"}
        >
          <span className="text-lg">{soundOn ? "🔊" : "🔇"}</span>
          Sound {soundOn ? "on" : "off"}
        </button>
      </div>
    );
  }

  // --- ACTIVE GAMEPLAY ---
  const watching = phase === "watch";
  const inMistake = phase === "mistake";
  const headerText = watching
    ? "👀 Watch!"
    : inMistake
    ? "💪 Try again!"
    : "👆 Your turn!";
  const headerColor = inMistake
    ? "text-rose-600"
    : watching
    ? "text-violet-700"
    : "text-emerald-600";

  return (
    <div className="flex flex-col gap-3">
      {/* Status bar */}
      <div className="flex items-center justify-between rounded-2xl border-2 border-violet-100 bg-white px-4 py-2 shadow-sm">
        <p className={`text-lg font-black ${headerColor}`}>{headerText}</p>
        <div className="flex items-center gap-3">
          <p className="text-sm font-black text-violet-700">
            {sequence.length} / {target}
          </p>
          <button
            type="button"
            onClick={() => persistSound(!soundOn)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-base transition-colors hover:bg-violet-200"
            aria-pressed={soundOn}
            aria-label={soundOn ? "Mute sound" : "Unmute sound"}
          >
            {soundOn ? "🔊" : "🔇"}
          </button>
        </div>
      </div>

      {/* Pad grid */}
      <div
        className={`grid grid-cols-2 gap-3 rounded-3xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-pink-50 p-3 shadow-md ${
          inMistake ? "animate-[shake_0.4s_ease-in-out]" : ""
        }`}
      >
        {PADS.map((pad) => {
          const isLit = litPad === pad.id;
          const disabled = phase !== "input";
          return (
            <button
              key={pad.id}
              type="button"
              disabled={disabled}
              onPointerDown={(e) => {
                e.preventDefault();
                handlePadTap(pad.id);
              }}
              className={`relative flex aspect-square items-center justify-center rounded-3xl border-4 border-white/60 text-6xl shadow-lg transition-all duration-100 ${
                isLit ? `${pad.lit} scale-105` : pad.base
              } ${disabled ? "cursor-default" : "cursor-pointer active:scale-95"}`}
              style={{
                boxShadow: isLit
                  ? "0 0 0 6px rgba(255,255,255,0.7), 0 8px 24px rgba(0,0,0,0.15)"
                  : undefined,
              }}
              aria-label={`Pad ${pad.id + 1}`}
            >
              <span
                style={{
                  animation: isLit ? "celebrate-bounce 0.5s ease-in-out" : undefined,
                  display: "inline-block",
                }}
              >
                {pad.emoji}
              </span>
            </button>
          );
        })}
      </div>

      {/* Back / change difficulty */}
      <div className="flex justify-center">
        <Button onClick={goToTitle} variant="ghost" size="sm">
          Change difficulty
        </Button>
      </div>
    </div>
  );
}
