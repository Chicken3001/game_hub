// ── Card types ────────────────────────────────────────────────────────────────

export const SUITS = ['h', 'd', 'c', 's'] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;
export type Rank = (typeof RANKS)[number];

/** Card string, e.g. "Ah", "Ts", "2c" */
export type Card = `${Rank}${Suit}`;

export const SUIT_SYMBOLS: Record<Suit, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };
export const SUIT_COLORS: Record<Suit, string> = { h: 'text-red-500', d: 'text-red-500', c: 'text-slate-800', s: 'text-slate-800' };

export const RANK_DISPLAY: Record<Rank, string> = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7',
  '8': '8', '9': '9', T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A',
};

// ── Blind schedule ───────────────────────────────────────────────────────────

export const BLIND_SCHEDULE: { small: number; big: number }[] = [
  { small: 5, big: 10 },
  { small: 10, big: 20 },
  { small: 15, big: 30 },
  { small: 25, big: 50 },
  { small: 50, big: 100 },
  { small: 75, big: 150 },
  { small: 100, big: 200 },
  { small: 150, big: 300 },
  { small: 200, big: 400 },
  { small: 300, big: 600 },
];

// ── Game state types ─────────────────────────────────────────────────────────

export type PokerPhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type GameStatus = 'waiting' | 'active' | 'finished' | 'cancelled';
export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all_in';

export interface PokerGameRow {
  id: string;
  host_id: string;
  status: GameStatus;
  phase: PokerPhase;
  community_cards: string[];
  pot: number;
  current_bet: number;
  dealer_seat: number;
  action_on_seat: number | null;
  max_players: number;
  starting_chips: number;
  blind_interval_minutes: number;
  blind_level: number;
  hand_number: number;
  hand_started_at: string | null;
  winner_id: string | null;
  last_action: string | null;
  created_at: string;
  updated_at: string;
}

export interface PokerPlayerRow {
  id: string;
  game_id: string;
  user_id: string;
  seat: number;
  chips: number;
  current_bet: number;
  total_bet: number;
  is_folded: boolean;
  is_all_in: boolean;
  is_eliminated: boolean;
  is_dealer: boolean;
  is_small_blind: boolean;
  is_big_blind: boolean;
  hand_description: string | null;
  show_cards: boolean;
  created_at: string;
  updated_at: string;
}

export interface PokerHoleCardsRow {
  id: string;
  game_id: string;
  user_id: string;
  cards: string[];
  created_at: string;
}

export interface ValidAction {
  action: PlayerAction;
  minAmount?: number;
  maxAmount?: number;
}
