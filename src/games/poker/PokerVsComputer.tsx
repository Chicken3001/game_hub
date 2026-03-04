'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PokerTable } from './PokerTable';
import {
  buildDeck, shuffleDeck, evaluateHand,
  getValidActions, getAiDecision, getCurrentBlinds,
  getNextActiveSeat, getFirstPostDealerSeat,
  getTimeUntilBlindIncrease,
} from './logic';
import { BLIND_SCHEDULE } from './types';
import type { PokerPlayerRow, PokerPhase, PlayerAction, Card } from './types';

interface Props {
  numOpponents: number;
  startingBlindLevel?: number;
  blindIntervalMinutes?: number;
  onChangeSettings: () => void;
}

interface LocalPlayer {
  id: string;
  userId: string;
  seat: number;
  chips: number;
  currentBet: number;
  totalBet: number;
  isFolded: boolean;
  isAllIn: boolean;
  isEliminated: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  handDescription: string | null;
  showCards: boolean;
  holeCards: string[];
  isAi: boolean;
  name: string;
  hasActedThisRound: boolean;
  bestCards: string[];
}

const AI_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank'];

function toPlayerRow(p: LocalPlayer): PokerPlayerRow {
  return {
    id: p.id,
    game_id: '',
    user_id: p.userId,
    seat: p.seat,
    chips: p.chips,
    current_bet: p.currentBet,
    total_bet: p.totalBet,
    is_folded: p.isFolded,
    is_all_in: p.isAllIn,
    is_eliminated: p.isEliminated,
    is_dealer: p.isDealer,
    is_small_blind: p.isSmallBlind,
    is_big_blind: p.isBigBlind,
    hand_description: p.handDescription,
    show_cards: p.showCards,
    created_at: '',
    updated_at: '',
  };
}

export function PokerVsComputer({ numOpponents, startingBlindLevel = 0, blindIntervalMinutes = 10, onChangeSettings }: Props) {
  const router = useRouter();
  const STARTING_CHIPS = 1000;

  const [players, setPlayers] = useState<LocalPlayer[]>(() => {
    const all: LocalPlayer[] = [];
    // Human player
    all.push({
      id: 'human', userId: 'human', seat: 0, chips: STARTING_CHIPS,
      currentBet: 0, totalBet: 0, isFolded: false, isAllIn: false,
      isEliminated: false, isDealer: false, isSmallBlind: false, isBigBlind: false,
      handDescription: null, showCards: false, holeCards: [], isAi: false, name: 'You',
      hasActedThisRound: false, bestCards: [],
    });
    for (let i = 0; i < numOpponents; i++) {
      all.push({
        id: `ai-${i}`, userId: `ai-${i}`, seat: i + 1, chips: STARTING_CHIPS,
        currentBet: 0, totalBet: 0, isFolded: false, isAllIn: false,
        isEliminated: false, isDealer: false, isSmallBlind: false, isBigBlind: false,
        handDescription: null, showCards: false, holeCards: [], isAi: true, name: AI_NAMES[i] ?? `Bot ${i + 1}`,
        hasActedThisRound: false, bestCards: [],
      });
    }
    return all;
  });

  const [deck, setDeck] = useState<string[]>([]);
  const [deckIdx, setDeckIdx] = useState(0);
  const [communityCards, setCommunityCards] = useState<string[]>([]);
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [phase, setPhase] = useState<PokerPhase>('waiting');
  const [actionOnSeat, setActionOnSeat] = useState<number | null>(null);
  const [dealerSeat, setDealerSeat] = useState(-1);
  const [blindLevel, setBlindLevel] = useState(startingBlindLevel);
  const [handNumber, setHandNumber] = useState(0);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [playerActions, setPlayerActions] = useState<Record<string, string>>({});
  const [gameStartedAt] = useState(() => new Date().toISOString());
  const [gameOver, setGameOver] = useState(false);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [showMyFoldedCards, setShowMyFoldedCards] = useState(false);

  const [blindTimeLeft, setBlindTimeLeft] = useState<number | null>(null);

  const [lastRaiseSize, setLastRaiseSize] = useState(0);

  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advancePhaseRef = useRef<() => void>(() => {});
  const processingActionRef = useRef(false);
  const currentBetRef = useRef(0);
  const lastRaiseSizeRef = useRef(0);

  const activePlayers = players.filter(p => !p.isEliminated);
  const activeSeats = activePlayers.map(p => p.seat).sort((a, b) => a - b);
  const blinds = getCurrentBlinds(blindLevel);

  const isHumanTurn = actionOnSeat === 0 && !players[0].isFolded && !players[0].isAllIn && phase !== 'waiting' && phase !== 'showdown';

  const humanValidActions = isHumanTurn
    ? getValidActions(players[0].chips, players[0].currentBet, currentBet, blinds.big, lastRaiseSize)
    : [];

  // ── Deal a new hand ────────────────────────────────────────────────────────
  const dealHand = useCallback(() => {
    const active = players.filter(p => !p.isEliminated);
    if (active.length < 2) {
      setGameOver(true);
      setWinnerId(active[0]?.userId ?? null);
      return;
    }

    // Update blind level based on elapsed time + starting level
    const elapsed = (Date.now() - new Date(gameStartedAt).getTime()) / 1000;
    const levelsGained = blindIntervalMinutes > 0 ? Math.floor(elapsed / (blindIntervalMinutes * 60)) : 0;
    const newLevel = Math.min(startingBlindLevel + levelsGained, 9);
    setBlindLevel(newLevel);
    const bl = getCurrentBlinds(newLevel);

    const seats = active.map(p => p.seat).sort((a, b) => a - b);

    // Advance dealer
    let newDealer = dealerSeat;
    const afterDealer = seats.filter(s => s > dealerSeat);
    newDealer = afterDealer.length > 0 ? afterDealer[0] : seats[0];
    setDealerSeat(newDealer);

    // Determine blinds positions
    let sbSeat: number, bbSeat: number, firstSeat: number;
    if (seats.length === 2) {
      sbSeat = newDealer;
      bbSeat = seats.find(s => s !== newDealer)!;
      firstSeat = sbSeat;
    } else {
      const afterDealerAll = seats.filter(s => s > newDealer);
      sbSeat = afterDealerAll.length > 0 ? afterDealerAll[0] : seats[0];
      const afterSb = seats.filter(s => s > sbSeat);
      bbSeat = afterSb.length > 0 ? afterSb[0] : seats[0];
      const afterBb = seats.filter(s => s > bbSeat);
      firstSeat = afterBb.length > 0 ? afterBb[0] : seats[0];
    }

    // Shuffle deck & deal
    const newDeck = shuffleDeck(buildDeck());
    setDeck(newDeck);
    let idx = 0;

    const updated = players.map(p => {
      if (p.isEliminated) return { ...p, holeCards: [], currentBet: 0, totalBet: 0, isFolded: false, isAllIn: false, isDealer: false, isSmallBlind: false, isBigBlind: false, handDescription: null, showCards: false, hasActedThisRound: false, bestCards: [] };
      const cards = [newDeck[idx], newDeck[idx + 1]];
      idx += 2;

      let chipCost = 0;
      let isSb = false, isBb = false;
      if (p.seat === sbSeat) {
        chipCost = Math.min(bl.small, p.chips);
        isSb = true;
      } else if (p.seat === bbSeat) {
        chipCost = Math.min(bl.big, p.chips);
        isBb = true;
      }

      return {
        ...p,
        holeCards: cards,
        currentBet: chipCost,
        totalBet: chipCost,
        chips: p.chips - chipCost,
        isFolded: false,
        isAllIn: chipCost >= p.chips,
        isDealer: p.seat === newDealer,
        isSmallBlind: isSb,
        isBigBlind: isBb,
        handDescription: null,
        showCards: false,
        hasActedThisRound: false,
        bestCards: [],
      };
    });

    const totalPot = updated.reduce((sum, p) => sum + p.totalBet, 0);

    // Determine actual first to act — skip players all-in from blind posting
    const allinFromBlinds = new Set(updated.filter(p => p.isAllIn).map(p => p.seat));
    let actualFirst: number | null = firstSeat;
    if (allinFromBlinds.has(firstSeat)) {
      const canActSeats = seats.filter(s => !allinFromBlinds.has(s));
      if (canActSeats.length === 0) {
        // Everyone all-in from blinds — no one can act
        actualFirst = null;
      } else {
        const after = canActSeats.filter(s => s > firstSeat);
        actualFirst = after.length > 0 ? after[0] : canActSeats[0];
      }
    }

    setPlayers(updated);
    setDeckIdx(idx);
    setCommunityCards([]);
    setPot(totalPot);
    setCurrentBet(bl.big);
    currentBetRef.current = bl.big;
    setLastRaiseSize(bl.big);
    lastRaiseSizeRef.current = bl.big;
    setPhase('preflop');
    setActionOnSeat(actualFirst);
    setHandNumber(h => h + 1);
    setLastAction(null);
    setPlayerActions({});
    setShowMyFoldedCards(false);

    // If no one can act (all-in from blinds), auto-advance through all streets
    if (actualFirst === null) {
      setTimeout(() => advancePhaseRef.current(), 500);
    }
  }, [players, dealerSeat, gameStartedAt, blindIntervalMinutes, startingBlindLevel]);

  // Auto-start first hand
  useEffect(() => {
    if (phase === 'waiting' && handNumber === 0) {
      const t = setTimeout(dealHand, 500);
      return () => clearTimeout(t);
    }
  }, [phase, handNumber, dealHand]);

  // ── Advance phase ──────────────────────────────────────────────────────────
  const advancePhase = useCallback(() => {
    const nextPhaseMap: Record<string, PokerPhase> = {
      preflop: 'flop', flop: 'turn', turn: 'river', river: 'showdown',
    };
    const nextPhase = nextPhaseMap[phase];
    if (!nextPhase) return;

    if (nextPhase === 'showdown') {
      // Run showdown
      runShowdown();
      return;
    }

    let newCommunity = [...communityCards];
    let newIdx = deckIdx;
    newIdx++; // burn card

    const cardsToReveal = nextPhase === 'flop' ? 3 : 1;
    for (let i = 0; i < cardsToReveal; i++) {
      newCommunity.push(deck[newIdx + i]);
    }
    newIdx += cardsToReveal;

    setDeckIdx(newIdx);
    setCommunityCards(newCommunity);
    setPhase(nextPhase);

    // Reset bets and hasActedThisRound for the new betting round
    let firstSeatToAct: number | null = null;
    let allInAdvance = false;

    setPlayers(prev => {
      const updated = prev.map(p => ({ ...p, currentBet: 0, hasActedThisRound: false }));
      const activeS = updated.filter(p => !p.isEliminated).map(p => p.seat).sort((a, b) => a - b);
      const foldedSet = new Set(updated.filter(p => p.isFolded || p.isEliminated).map(p => p.seat));
      const allinSet = new Set(updated.filter(p => p.isAllIn).map(p => p.seat));
      const first = getFirstPostDealerSeat(activeS, dealerSeat, foldedSet, allinSet);

      if (first === null) {
        allInAdvance = true;
      } else {
        firstSeatToAct = first;
      }

      return updated;
    });

    // setState calls OUTSIDE the updater
    if (allInAdvance) {
      setTimeout(() => advancePhaseAfterAllIn(nextPhase, newCommunity, newIdx), 800);
    } else if (firstSeatToAct !== null) {
      setActionOnSeat(firstSeatToAct);
    }
    setCurrentBet(0);
    currentBetRef.current = 0;
    setLastRaiseSize(blinds.big);
    lastRaiseSizeRef.current = blinds.big;
    setPlayerActions({});
    setLastAction(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, communityCards, deck, deckIdx, dealerSeat]);

  // Keep advancePhase ref in sync (it's a new callback each render)
  // Note: currentBetRef and lastRaiseSizeRef are updated directly where they change
  // — do NOT sync them from state here, as it can overwrite values set in processAction
  // if React splits setPlayers/setCurrentBet across render cycles.
  advancePhaseRef.current = advancePhase;

  const advancePhaseAfterAllIn = useCallback((currentPhase: PokerPhase, community: string[], dIdx: number) => {
    const phaseOrder: PokerPhase[] = ['preflop', 'flop', 'turn', 'river', 'showdown'];
    const currentIdx = phaseOrder.indexOf(currentPhase);
    if (currentIdx === -1 || currentIdx >= phaseOrder.length - 1) {
      runShowdownWith(community);
      return;
    }

    const nextPhase = phaseOrder[currentIdx + 1];
    if (nextPhase === 'showdown') {
      runShowdownWith(community);
      return;
    }

    let newCommunity = [...community];
    let newIdx = dIdx;
    newIdx++; // burn
    const cardsToReveal = nextPhase === 'flop' ? 3 : 1;
    for (let i = 0; i < cardsToReveal; i++) {
      newCommunity.push(deck[newIdx + i]);
    }
    newIdx += cardsToReveal;

    setDeckIdx(newIdx);
    setCommunityCards(newCommunity);
    setPhase(nextPhase);

    setTimeout(() => advancePhaseAfterAllIn(nextPhase, newCommunity, newIdx), 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck]);

  // ── Showdown ───────────────────────────────────────────────────────────────
  function runShowdown() {
    runShowdownWith(communityCards);
  }

  // Uses setPlayers(prev => ...) to always read the latest player state,
  // avoiding stale closure bugs when called from advancePhaseAfterAllIn.
  // State setters (setPhase etc.) are called AFTER setPlayers to avoid
  // React batching issues from calling setState inside a setState updater.
  function runShowdownWith(community: string[]) {
    let isOver = false;
    let winner: string | null = null;

    setPlayers(prev => {
      const active = prev.filter(p => !p.isEliminated);

      // Evaluate hands — don't set showCards yet, determined after pot awarding
      const evaluated = active.map(p => {
        if (p.isFolded) {
          // Still evaluate hand so description is available if player chooses to show
          if (p.holeCards.length > 0 && community.length >= 3) {
            const allCards = [...p.holeCards, ...community];
            const { score, name, bestCards } = evaluateHand(allCards);
            return { ...p, score, handDescription: name, showCards: false, bestCards };
          }
          return { ...p, score: 0, handDescription: null, showCards: false, bestCards: [] };
        }
        const allCards = [...p.holeCards, ...community];
        const { score, name, bestCards } = evaluateHand(allCards);
        return { ...p, score, handDescription: name, showCards: false, bestCards };
      });

      // Side pot awarding — track who wins a pot
      const potWinners = new Set<string>();
      const bettors = evaluated.filter(p => p.totalBet > 0 || !p.isFolded);
      const sorted = [...bettors].sort((a, b) => a.totalBet - b.totalBet);

      const processed = new Set<string>();
      let prevLevel = 0;

      for (const player of sorted) {
        if (player.totalBet <= prevLevel) { processed.add(player.userId); continue; }

        const level = player.totalBet;
        const contribution = level - prevLevel;
        let potAmount = 0;
        for (const p of evaluated) {
          if (p.totalBet > prevLevel) {
            potAmount += Math.min(p.totalBet - prevLevel, contribution);
          }
        }

        const eligible = evaluated.filter(p => !p.isFolded && !processed.has(p.userId) && p.totalBet >= level);
        if (eligible.length > 0) {
          const bestScore = Math.max(...eligible.map(p => p.score ?? 0));
          const winners = eligible.filter(p => p.score === bestScore);
          const share = Math.floor(potAmount / winners.length);
          const remainder = potAmount - share * winners.length;
          for (let wi = 0; wi < winners.length; wi++) {
            const idx = evaluated.findIndex(p => p.userId === winners[wi].userId);
            // First winner gets remainder chip(s) — standard poker odd-chip rule
            const bonus = wi === 0 ? remainder : 0;
            if (idx !== -1) evaluated[idx] = { ...evaluated[idx], chips: evaluated[idx].chips + share + bonus };
            potWinners.add(winners[wi].userId);
          }
        }

        processed.add(player.userId);
        prevLevel = level;
      }

      // Only pot winners must show cards (standard poker rules — losers can muck)
      for (let i = 0; i < evaluated.length; i++) {
        if (potWinners.has(evaluated[i].userId)) {
          evaluated[i] = { ...evaluated[i], showCards: true };
        }
      }

      // Mark eliminated
      const final = evaluated.map(p => ({
        ...p,
        isEliminated: p.isEliminated || p.chips === 0,
        totalBet: 0,
        currentBet: 0,
      }));

      // Build back LocalPlayer array
      const result: LocalPlayer[] = prev.map(p => {
        const ev = final.find(e => e.userId === p.userId);
        if (!ev) return p;
        return {
          ...p,
          chips: ev.chips,
          isEliminated: ev.isEliminated,
          handDescription: ev.handDescription,
          showCards: ev.showCards,
          bestCards: ev.bestCards ?? [],
          totalBet: 0,
          currentBet: 0,
        };
      });

      // Capture for use after setPlayers
      const remaining = result.filter(p => !p.isEliminated);
      if (remaining.length <= 1) {
        isOver = true;
        winner = remaining[0]?.userId ?? null;
      }

      return result;
    });

    // Set these OUTSIDE the setPlayers updater so React batches them together
    // in the same render cycle as the player state update
    setPhase('showdown');
    setActionOnSeat(null);
    setLastAction('showdown');
    if (isOver) {
      setGameOver(true);
      setWinnerId(winner);
    }
  }

  // ── Process action ─────────────────────────────────────────────────────────
  const processAction = useCallback((userId: string, action: PlayerAction, amount?: number) => {
    // Signals from inside setPlayers updater for setState calls outside
    let potDelta = 0;
    let newCurrentBet: number | null = null;
    let newLastRaiseSize: number | null = null;
    let winByFold = false;
    let advanceAfter = false;
    let advanceDelay = 0;
    let nextSeatToSet: number | null = null;
    let actionTextForLog = '';

    setPlayers(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(p => p.userId === userId);
      if (idx === -1) return prev;
      const p = { ...updated[idx] };

      const betToMatch = currentBetRef.current;
      const callAmount = betToMatch - p.currentBet;

      switch (action) {
        case 'fold':
          p.isFolded = true;
          actionTextForLog = 'Fold';
          break;
        case 'check':
          actionTextForLog = 'Check';
          break;
        case 'call': {
          const actual = Math.min(callAmount, p.chips);
          p.chips -= actual;
          p.currentBet += actual;
          p.totalBet += actual;
          p.isAllIn = p.chips === 0;
          potDelta = actual;
          actionTextForLog = `Call ${actual}`;
          break;
        }
        case 'raise': {
          const clampedAmount = Math.max(betToMatch, Math.min(amount ?? betToMatch, p.currentBet + p.chips));
          const raiseCost = clampedAmount - p.currentBet;
          const raiseIncrement = clampedAmount - betToMatch;
          p.chips -= raiseCost;
          p.currentBet = clampedAmount;
          p.totalBet += raiseCost;
          p.isAllIn = p.chips === 0;
          potDelta = raiseCost;
          newCurrentBet = clampedAmount;
          currentBetRef.current = clampedAmount;
          newLastRaiseSize = raiseIncrement;
          lastRaiseSizeRef.current = raiseIncrement;
          actionTextForLog = betToMatch === 0 ? `Bet ${clampedAmount}` : `Raise ${clampedAmount}`;
          break;
        }
        case 'all_in': {
          const allInAmount = p.chips;
          const newBet = p.currentBet + allInAmount;
          p.chips = 0;
          p.currentBet = newBet;
          p.totalBet += allInAmount;
          p.isAllIn = true;
          potDelta = allInAmount;
          if (newBet > betToMatch) {
            const raiseIncrement = newBet - betToMatch;
            if (raiseIncrement >= lastRaiseSizeRef.current) {
              newLastRaiseSize = raiseIncrement;
              lastRaiseSizeRef.current = raiseIncrement;
            }
            newCurrentBet = newBet;
            currentBetRef.current = newBet;
          }
          actionTextForLog = 'All In';
          break;
        }
      }

      p.hasActedThisRound = true;
      updated[idx] = p;

      // On raise or full-raise all-in, other players need to respond
      const isFullRaise = action === 'raise' ||
        (action === 'all_in' && p.currentBet > betToMatch && (p.currentBet - betToMatch) >= lastRaiseSizeRef.current);
      if (isFullRaise) {
        for (let i = 0; i < updated.length; i++) {
          if (i !== idx && !updated[i].isFolded && !updated[i].isAllIn && !updated[i].isEliminated) {
            updated[i] = { ...updated[i], hasActedThisRound: false };
          }
        }
      }

      // Check if only one player remaining (everyone else folded)
      const notFolded = updated.filter(q => !q.isEliminated && !q.isFolded);
      if (notFolded.length === 1) {
        const winnerIdx = updated.findIndex(q => q.userId === notFolded[0].userId);
        const totalBets = updated.reduce((s, q) => s + q.totalBet, 0);
        updated[winnerIdx] = { ...updated[winnerIdx], chips: updated[winnerIdx].chips + totalBets };
        updated.forEach((q, i) => { updated[i] = { ...q, totalBet: 0, currentBet: 0 }; });
        winByFold = true;
        return updated;
      }

      // Find next seat
      const foldedSet = new Set(updated.filter(q => q.isFolded || q.isEliminated).map(q => q.seat));
      const allinSet = new Set(updated.filter(q => q.isAllIn).map(q => q.seat));
      const aSeats = updated.filter(q => !q.isEliminated).map(q => q.seat).sort((a, b) => a - b);
      const nextSeat = getNextActiveSeat(aSeats, p.seat, foldedSet, allinSet);

      if (nextSeat === null) {
        advanceAfter = true;
        advanceDelay = 500;
        return updated;
      }

      // Check if round complete
      const canAct = updated.filter(q => !q.isEliminated && !q.isFolded && !q.isAllIn);
      const maxBet = Math.max(...canAct.map(q => q.currentBet), 0);
      const allEqual = canAct.every(q => q.currentBet >= maxBet);
      const allActed = canAct.every(q => q.hasActedThisRound);

      if (allEqual && allActed) {
        advanceAfter = true;
        advanceDelay = 300;
        return updated;
      }

      nextSeatToSet = nextSeat;
      return updated;
    });

    // All setState calls OUTSIDE the updater for proper React batching
    if (potDelta > 0) setPot(pot => pot + potDelta);
    if (newCurrentBet !== null) setCurrentBet(newCurrentBet);
    if (newLastRaiseSize !== null) setLastRaiseSize(newLastRaiseSize);
    setLastAction(action);
    setPlayerActions(pa => ({ ...pa, [userId]: actionTextForLog }));

    if (winByFold) {
      setPot(0);
      setPhase('showdown');
      setActionOnSeat(null);
      setLastAction('win_by_fold');
    } else if (advanceAfter) {
      setActionOnSeat(null);  // Hide buttons during phase transition
      setTimeout(() => advancePhaseRef.current(), advanceDelay);
    } else if (nextSeatToSet !== null) {
      setActionOnSeat(nextSeatToSet);
    }
  }, [advancePhase]);

  // Clear double-click guard when turn or phase changes
  useEffect(() => {
    processingActionRef.current = false;
  }, [actionOnSeat, phase]);

  // Blind countdown timer
  useEffect(() => {
    if (blindIntervalMinutes <= 0 || blindLevel >= 9) {
      setBlindTimeLeft(null);
      return;
    }
    const tick = () => {
      // Time is relative to startingBlindLevel — calculate when the NEXT level after current kicks in
      const levelsGained = blindLevel - startingBlindLevel;
      const nextLevelTime = (levelsGained + 1) * blindIntervalMinutes * 60 * 1000;
      const gameStart = new Date(gameStartedAt).getTime();
      const remaining = Math.max(0, gameStart + nextLevelTime - Date.now());
      setBlindTimeLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [blindLevel, blindIntervalMinutes, startingBlindLevel, gameStartedAt]);

  // ── AI turn processing ─────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'waiting' || phase === 'showdown') return;
    if (actionOnSeat === null) return;

    const aiPlayer = players.find(p => p.seat === actionOnSeat && p.isAi && !p.isFolded && !p.isAllIn && !p.isEliminated);
    if (!aiPlayer) return;

    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    aiTimerRef.current = setTimeout(() => {
      // Use ref for currentBet to avoid stale closure values
      const curBet = currentBetRef.current;
      const actions = getValidActions(aiPlayer.chips, aiPlayer.currentBet, curBet, blinds.big, lastRaiseSizeRef.current);
      const callAmount = curBet - aiPlayer.currentBet;
      const decision = getAiDecision(
        aiPlayer.holeCards, communityCards, actions, pot, callAmount, aiPlayer.chips, phase
      );
      processAction(aiPlayer.userId, decision.action, decision.amount);
    }, 1500 + Math.random() * 1500);

    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionOnSeat, phase]);

  // ── Human action handler ───────────────────────────────────────────────────
  function handleHumanAction(action: PlayerAction, amount?: number) {
    if (!isHumanTurn || processingActionRef.current) return;
    processingActionRef.current = true;
    processAction('human', action, amount);
  }

  // ── Next hand ──────────────────────────────────────────────────────────────
  function handleNextHand() {
    if (gameOver) return;
    dealHand();
  }

  // ── Build display data ─────────────────────────────────────────────────────
  const displayPlayers = players.map(toPlayerRow);
  const revealedCards: Record<string, string[]> = {};
  if (phase === 'showdown') {
    // Show hole cards for pot winners (must show) and anyone who chose to show
    players.forEach(p => {
      if (p.showCards && p.holeCards.length > 0) {
        revealedCards[p.userId] = p.holeCards;
      }
    });
    // Human voluntarily showing cards (folded or non-winner)
    if (showMyFoldedCards && players[0].holeCards.length > 0 && !players[0].showCards) {
      revealedCards['human'] = players[0].holeCards;
    }
  }

  // Live hand description for the human player
  let myHandDescription: string | null = null;
  if (phase !== 'waiting' && phase !== 'showdown' && players[0].holeCards.length > 0 && !players[0].isFolded) {
    const allCards = [...players[0].holeCards, ...communityCards];
    if (allCards.length >= 5) {
      const { name } = evaluateHand(allCards);
      myHandDescription = name;
    } else if (allCards.length === 2) {
      // Preflop — check for pocket pair or just show high card
      const r1 = allCards[0][0], r2 = allCards[1][0];
      myHandDescription = r1 === r2 ? 'Pair' : 'High Card';
    }
  }

  // Find the winner's best 5 cards for highlighting at showdown
  let winnerBestCards: string[] = [];
  let winnerUserId: string | null = null;
  if (phase === 'showdown' && lastAction !== 'win_by_fold') {
    const showdownPlayers = players.filter(p => p.showCards && !p.isFolded && p.bestCards.length > 0);
    if (showdownPlayers.length > 0) {
      // Find the player with the highest hand score
      let bestScore = 0;
      for (const p of showdownPlayers) {
        const allCards = [...p.holeCards, ...communityCards];
        const { score } = evaluateHand(allCards);
        if (score > bestScore) {
          bestScore = score;
          winnerBestCards = p.bestCards;
          winnerUserId = p.userId;
        }
      }
    }
  }

  // Next blind level info
  const nextBlinds = blindLevel < 9 ? getCurrentBlinds(blindLevel + 1) : null;

  const usernameMap: Record<string, string> = {};
  players.forEach(p => { usernameMap[p.userId] = p.name; });

  return (
    <div className="flex flex-col items-center gap-4">
      {gameOver && (
        <div className={`flex flex-col items-center gap-3 rounded-3xl border-2 px-8 py-6 shadow-md w-full max-w-sm ${
          winnerId === 'human' ? 'border-green-300 bg-green-50' : 'border-rose-300 bg-rose-50'
        }`}>
          <div className="text-4xl">{winnerId === 'human' ? '🏆' : '🤖'}</div>
          <p className={`text-xl font-black ${winnerId === 'human' ? 'text-green-700' : 'text-rose-700'}`}>
            {winnerId === 'human' ? 'You win!' : `${usernameMap[winnerId ?? ''] ?? 'Computer'} wins!`}
          </p>
          <div className="flex gap-2 flex-wrap justify-center">
            <button
              onClick={onChangeSettings}
              className="rounded-2xl border-2 border-green-300 bg-green-500 px-5 py-2 text-sm font-black text-white shadow transition hover:bg-green-600 active:scale-95"
            >
              🔄 Play Again
            </button>
            <button
              onClick={() => router.push('/games/poker')}
              className="rounded-2xl border-2 border-emerald-300 bg-emerald-600 px-5 py-2 text-sm font-black text-white shadow transition hover:bg-emerald-700 active:scale-95"
            >
              Lobby
            </button>
          </div>
        </div>
      )}

      {phase === 'showdown' && !gameOver && (
        <div className="flex flex-col items-center gap-2 w-full max-w-sm">
          <div className="rounded-xl bg-amber-100 border border-amber-300 px-4 py-2 text-center">
            <p className="text-sm font-black text-amber-800">
              {lastAction === 'win_by_fold' ? 'Everyone folded!' : 'Showdown!'}
            </p>
          </div>
          <div className="flex gap-2 w-full">
            <button
              onClick={handleNextHand}
              className="flex-1 rounded-2xl border-2 border-emerald-400 bg-emerald-600 px-6 py-3 font-black text-white shadow transition hover:bg-emerald-700 active:scale-95"
            >
              🃏 Deal Next Hand
            </button>
            {!players[0].showCards && !showMyFoldedCards && players[0].holeCards.length > 0 && (
              <button
                onClick={() => setShowMyFoldedCards(true)}
                className="rounded-2xl border-2 border-slate-400 bg-slate-600 px-4 py-3 font-black text-white shadow transition hover:bg-slate-700 active:scale-95"
              >
                Show Cards
              </button>
            )}
          </div>
        </div>
      )}

      <PokerTable
        players={displayPlayers}
        communityCards={communityCards}
        pot={pot}
        phase={phase}
        currentBet={currentBet}
        blindLevel={blindLevel}
        blindSmall={blinds.small}
        blindBig={blinds.big}
        actionOnSeat={actionOnSeat}
        myUserId="human"
        myHoleCards={players[0].holeCards}
        revealedCards={revealedCards}
        validActions={humanValidActions}
        onAction={handleHumanAction}
        isMyTurn={isHumanTurn}
        handNumber={handNumber}
        lastAction={lastAction}
        usernames={usernameMap}
        playerActions={playerActions}
        winnerBestCards={winnerBestCards}
        winnerUserId={winnerUserId}
        myHandDescription={myHandDescription}
        nextBlindSmall={nextBlinds?.small ?? null}
        nextBlindBig={nextBlinds?.big ?? null}
        blindTimeLeft={blindTimeLeft}
      />
    </div>
  );
}
