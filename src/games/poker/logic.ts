import {
  SUITS, RANKS, BLIND_SCHEDULE,
  type Card, type Suit, type Rank, type ValidAction, type PlayerAction,
  type PokerPlayerRow,
} from './types';

// ── Deck helpers ─────────────────────────────────────────────────────────────

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push(`${r}${s}` as Card);
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const a = [...deck];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Card parsing ─────────────────────────────────────────────────────────────

const RANK_VALUE: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, T: 10, J: 11, Q: 12, K: 13, A: 14,
};

function parseCard(card: string): { rank: number; suit: number } {
  const r = card[0];
  const s = card[1];
  return {
    rank: RANK_VALUE[r] ?? 0,
    suit: s === 'h' ? 0 : s === 'd' ? 1 : s === 'c' ? 2 : 3,
  };
}

// ── Hand evaluation (mirrors PL/pgSQL) ───────────────────────────────────────

export function evaluateHand(cards: string[]): { score: number; name: string; bestCards: string[] } {
  const parsed = cards.map(parseCard);
  const n = parsed.length;
  let bestScore = 0;
  let bestIndices: number[] = [];

  // Evaluate all C(n,5) combinations
  for (let c1 = 0; c1 < n; c1++) {
    for (let c2 = c1 + 1; c2 < n; c2++) {
      for (let c3 = c2 + 1; c3 < n; c3++) {
        for (let c4 = c3 + 1; c4 < n; c4++) {
          for (let c5 = c4 + 1; c5 < n; c5++) {
            const combo = [parsed[c1], parsed[c2], parsed[c3], parsed[c4], parsed[c5]];
            // Sort descending by rank
            combo.sort((a, b) => b.rank - a.rank);

            const ranks = combo.map(c => c.rank);
            const suits = combo.map(c => c.suit);

            const isFlush = suits.every(s => s === suits[0]);
            let isStraight = ranks[0] - ranks[4] === 4 &&
              new Set(ranks).size === 5;

            // Ace-low straight
            if (!isStraight && ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
              isStraight = true;
              ranks[0] = 5; ranks[1] = 4; ranks[2] = 3; ranks[3] = 2; ranks[4] = 1;
              ranks.sort((a, b) => b - a);
            }

            // Count ranks
            const counts: Record<number, number> = {};
            for (const r of ranks) counts[r] = (counts[r] || 0) + 1;

            const pairs: number[] = [];
            const trips: number[] = [];
            const quads: number[] = [];
            const kickers: number[] = [];

            for (let r = 14; r >= 1; r--) {
              if (counts[r] === 4) quads.push(r);
              else if (counts[r] === 3) trips.push(r);
              else if (counts[r] === 2) pairs.push(r);
              else if (counts[r] === 1) kickers.push(r);
            }

            let score = 0;
            if (isFlush && isStraight) {
              score = 9e10 + ranks[0] * 1e8;
            } else if (quads.length === 1) {
              score = 8e10 + quads[0] * 1e8 + (kickers[0] || 0) * 1e6;
            } else if (trips.length === 1 && pairs.length >= 1) {
              score = 7e10 + trips[0] * 1e8 + pairs[0] * 1e6;
            } else if (isFlush) {
              score = 6e10 + ranks[0] * 1e8 + ranks[1] * 1e6 + ranks[2] * 1e4 + ranks[3] * 1e2 + ranks[4];
            } else if (isStraight) {
              score = 5e10 + ranks[0] * 1e8;
            } else if (trips.length === 1) {
              score = 4e10 + trips[0] * 1e8 + (kickers[0] || 0) * 1e6 + (kickers[1] || 0) * 1e4;
            } else if (pairs.length === 2) {
              score = 3e10 + pairs[0] * 1e8 + pairs[1] * 1e6 + (kickers[0] || 0) * 1e4;
            } else if (pairs.length === 1) {
              score = 2e10 + pairs[0] * 1e8 + (kickers[0] || 0) * 1e6 + (kickers[1] || 0) * 1e4 + (kickers[2] || 0) * 1e2;
            } else {
              score = 1e10 + ranks[0] * 1e8 + ranks[1] * 1e6 + ranks[2] * 1e4 + ranks[3] * 1e2 + ranks[4];
            }

            if (score > bestScore) {
              bestScore = score;
              bestIndices = [c1, c2, c3, c4, c5];
            }
          }
        }
      }
    }
  }

  return { score: bestScore, name: getHandName(bestScore), bestCards: bestIndices.map(i => cards[i]) };
}

function getHandName(score: number): string {
  const rank = Math.floor(score / 1e10);
  switch (rank) {
    case 9: return 'Straight Flush';
    case 8: return 'Four of a Kind';
    case 7: return 'Full House';
    case 6: return 'Flush';
    case 5: return 'Straight';
    case 4: return 'Three of a Kind';
    case 3: return 'Two Pair';
    case 2: return 'Pair';
    case 1: return 'High Card';
    default: return 'Unknown';
  }
}

// ── Hand classification for AI ───────────────────────────────────────────────

function classifyStartingHand(cards: string[]): 'premium' | 'strong' | 'playable' | 'weak' {
  const r1 = RANK_VALUE[cards[0][0]] ?? 0;
  const r2 = RANK_VALUE[cards[1][0]] ?? 0;
  const suited = cards[0][1] === cards[1][1];
  const high = Math.max(r1, r2);
  const low = Math.min(r1, r2);

  // Pocket pairs
  if (r1 === r2) {
    if (r1 >= 11) return 'premium'; // JJ+
    if (r1 >= 7) return 'strong';   // 77-TT
    return 'playable';               // 22-66
  }

  // AK, AQ suited
  if (high === 14 && low >= 12 && suited) return 'premium';
  if (high === 14 && low >= 12) return 'strong';    // AK, AQ offsuit
  if (high === 14 && low >= 10) return 'playable';  // AT-AJ
  if (suited && high - low <= 2 && high >= 9) return 'playable'; // Suited connectors 9+
  if (high >= 12 && low >= 10) return 'playable';   // Broadway

  return 'weak';
}

// ── Valid actions ────────────────────────────────────────────────────────────

export function getValidActions(
  playerChips: number,
  playerCurrentBet: number,
  gameCurBet: number,
  bigBlind: number,
): ValidAction[] {
  const actions: ValidAction[] = [];
  const callAmount = gameCurBet - playerCurrentBet;

  // Fold is always valid (unless no bet to face)
  if (callAmount > 0) {
    actions.push({ action: 'fold' });
  }

  // Check (only if no bet to match)
  if (callAmount <= 0) {
    actions.push({ action: 'check' });
  }

  // Call
  if (callAmount > 0 && playerChips > 0) {
    actions.push({ action: 'call' });
  }

  // Raise (min raise is current_bet + big_blind)
  const minRaise = gameCurBet + bigBlind;
  if (playerChips + playerCurrentBet > gameCurBet) {
    if (playerChips + playerCurrentBet >= minRaise) {
      actions.push({
        action: 'raise',
        minAmount: minRaise,
        maxAmount: playerChips + playerCurrentBet,
      });
    }
  }

  // All-in (always available if you have chips)
  if (playerChips > 0) {
    actions.push({ action: 'all_in' });
  }

  return actions;
}

// ── Seat helpers ─────────────────────────────────────────────────────────────

export function getNextActiveSeat(
  seats: number[],
  currentSeat: number,
  excludeFolded: Set<number>,
  excludeAllIn: Set<number>,
): number | null {
  const active = seats.filter(s => !excludeFolded.has(s) && !excludeAllIn.has(s));
  if (active.length === 0) return null;
  const after = active.filter(s => s > currentSeat);
  return after.length > 0 ? after[0] : active[0];
}

export function getFirstPostDealerSeat(
  seats: number[],
  dealerSeat: number,
  excludeFolded: Set<number>,
  excludeAllIn: Set<number>,
): number | null {
  const active = seats.filter(s => !excludeFolded.has(s) && !excludeAllIn.has(s));
  if (active.length === 0) return null;
  const after = active.filter(s => s > dealerSeat);
  return after.length > 0 ? after[0] : active[0];
}

// ── Blind helpers ────────────────────────────────────────────────────────────

export function getCurrentBlinds(level: number): { small: number; big: number } {
  return BLIND_SCHEDULE[Math.min(level, BLIND_SCHEDULE.length - 1)];
}

export function getBlindLevel(createdAt: string, intervalMinutes: number): number {
  if (intervalMinutes <= 0) return 0;
  const elapsed = (Date.now() - new Date(createdAt).getTime()) / 1000;
  return Math.min(Math.floor(elapsed / (intervalMinutes * 60)), 9);
}

export function getTimeUntilBlindIncrease(
  createdAt: string,
  intervalMinutes: number,
  currentLevel: number,
): number {
  if (intervalMinutes <= 0 || currentLevel >= 9) return Infinity;
  const nextLevelTime = (currentLevel + 1) * intervalMinutes * 60 * 1000;
  const gameStart = new Date(createdAt).getTime();
  return Math.max(0, gameStart + nextLevelTime - Date.now());
}

// ── Side pot calculation ─────────────────────────────────────────────────────

export interface SidePot {
  amount: number;
  eligible: string[]; // user_ids
}

export function calculateSidePots(players: { userId: string; totalBet: number; isFolded: boolean }[]): SidePot[] {
  const pots: SidePot[] = [];
  const sorted = [...players].sort((a, b) => a.totalBet - b.totalBet);
  let processed = 0;

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].totalBet <= processed) continue;
    const level = sorted[i].totalBet;
    const contribution = level - processed;
    let potAmount = 0;

    for (const p of sorted) {
      if (p.totalBet > processed) {
        potAmount += Math.min(p.totalBet - processed, contribution);
      }
    }

    const eligible = players
      .filter(p => !p.isFolded && p.totalBet >= level)
      .map(p => p.userId);

    if (potAmount > 0) {
      pots.push({ amount: potAmount, eligible });
    }
    processed = level;
  }

  return pots;
}

// ── AI Decision Engine ───────────────────────────────────────────────────────

export function getAiDecision(
  holeCards: string[],
  communityCards: string[],
  validActions: ValidAction[],
  potSize: number,
  callAmount: number,
  playerChips: number,
  phase: string,
): { action: PlayerAction; amount?: number } {
  const random15 = Math.random() < 0.15;

  // Preflop strategy based on hand classification
  if (phase === 'preflop') {
    const classification = classifyStartingHand(holeCards);

    if (random15) {
      // 15% random: do something unexpected
      const randomAction = validActions[Math.floor(Math.random() * validActions.length)];
      if (randomAction.action === 'raise' && randomAction.minAmount) {
        return { action: 'raise', amount: randomAction.minAmount };
      }
      return { action: randomAction.action };
    }

    switch (classification) {
      case 'premium': {
        const raiseAction = validActions.find(a => a.action === 'raise');
        if (raiseAction && raiseAction.minAmount) {
          // Raise 3x big blind
          const raiseAmount = Math.min(raiseAction.minAmount * 3, raiseAction.maxAmount ?? raiseAction.minAmount);
          return { action: 'raise', amount: raiseAmount };
        }
        return { action: validActions.find(a => a.action === 'call') ? 'call' : 'check' };
      }
      case 'strong': {
        const raiseAction = validActions.find(a => a.action === 'raise');
        if (raiseAction && raiseAction.minAmount && Math.random() > 0.4) {
          return { action: 'raise', amount: raiseAction.minAmount };
        }
        return { action: validActions.find(a => a.action === 'call') ? 'call' : 'check' };
      }
      case 'playable': {
        if (callAmount <= playerChips * 0.05) {
          return { action: validActions.find(a => a.action === 'call') ? 'call' : 'check' };
        }
        return { action: validActions.find(a => a.action === 'fold') ? 'fold' : 'check' };
      }
      case 'weak': {
        if (callAmount === 0) return { action: 'check' };
        if (callAmount <= playerChips * 0.02 && Math.random() > 0.5) {
          return { action: 'call' };
        }
        return { action: validActions.find(a => a.action === 'fold') ? 'fold' : 'check' };
      }
    }
  }

  // Post-flop: evaluate hand strength with community cards
  const allCards = [...holeCards, ...communityCards];
  const { score } = evaluateHand(allCards);
  const handRank = Math.floor(score / 1e10);

  // Pot odds calculation
  const potOdds = callAmount > 0 ? callAmount / (potSize + callAmount) : 0;

  if (random15) {
    // Random play — bluff or slow-play
    if (handRank >= 5) {
      // Strong hand, random check/call (slow-play)
      return { action: validActions.find(a => a.action === 'check') ? 'check' : 'call' };
    }
    // Weak hand, random raise (bluff)
    const raiseAction = validActions.find(a => a.action === 'raise');
    if (raiseAction && raiseAction.minAmount) {
      return { action: 'raise', amount: raiseAction.minAmount };
    }
    return { action: validActions.find(a => a.action === 'call') ? 'call' : 'check' };
  }

  // Strong hands (three of a kind+): bet/raise aggressively
  if (handRank >= 4) {
    const raiseAction = validActions.find(a => a.action === 'raise');
    if (raiseAction && raiseAction.minAmount) {
      const raiseSize = handRank >= 7
        ? Math.min(potSize, raiseAction.maxAmount ?? raiseAction.minAmount)
        : raiseAction.minAmount;
      return { action: 'raise', amount: Math.max(raiseSize, raiseAction.minAmount) };
    }
    if (validActions.find(a => a.action === 'call')) return { action: 'call' };
    return { action: 'check' };
  }

  // Medium hands (pair, two pair): call/check, occasional raise
  if (handRank >= 2) {
    if (potOdds < 0.3 && callAmount > 0) return { action: 'call' };
    if (callAmount === 0) {
      const raiseAction = validActions.find(a => a.action === 'raise');
      if (raiseAction && raiseAction.minAmount && Math.random() > 0.6) {
        return { action: 'raise', amount: raiseAction.minAmount };
      }
      return { action: 'check' };
    }
    if (callAmount <= playerChips * 0.1) return { action: 'call' };
    return { action: validActions.find(a => a.action === 'fold') ? 'fold' : 'check' };
  }

  // Weak hands: fold if facing bet, check if free
  if (callAmount === 0) return { action: 'check' };
  if (callAmount <= playerChips * 0.03) return { action: 'call' };
  return { action: validActions.find(a => a.action === 'fold') ? 'fold' : 'check' };
}
