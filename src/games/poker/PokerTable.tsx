'use client';

import { useState, useEffect } from 'react';
import {
  SUIT_SYMBOLS, SUIT_COLORS, RANK_DISPLAY,
  type PokerPlayerRow, type PokerPhase, type ValidAction, type PlayerAction,
} from './types';

function formatTimeLeft(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ── CardDisplay ──────────────────────────────────────────────────────────────

function CardDisplay({ card, faceDown, small, highlight }: { card?: string; faceDown?: boolean; small?: boolean; highlight?: boolean }) {
  if (faceDown || !card) {
    return (
      <div className={`${small ? 'w-7 h-10' : 'w-10 h-14'} rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-400 shadow-md flex items-center justify-center`}>
        <span className={`${small ? 'text-[10px]' : 'text-sm'} text-blue-200 font-black`}>?</span>
      </div>
    );
  }

  const rank = card[0] as keyof typeof RANK_DISPLAY;
  const suit = card[1] as keyof typeof SUIT_SYMBOLS;
  const color = SUIT_COLORS[suit] ?? 'text-slate-800';

  return (
    <div className={`${small ? 'w-7 h-10' : 'w-10 h-14'} rounded-lg bg-white shadow-md flex flex-col items-center justify-center ${color} ${highlight ? 'border-2 border-amber-400 ring-1 ring-amber-300' : 'border-2 border-slate-200'}`}>
      <span className={`${small ? 'text-[10px]' : 'text-sm'} font-black leading-none`}>{RANK_DISPLAY[rank]}</span>
      <span className={`${small ? 'text-[10px]' : 'text-sm'} leading-none`}>{SUIT_SYMBOLS[suit]}</span>
    </div>
  );
}

// ── ActionButtons ────────────────────────────────────────────────────────────

function ActionButtons({
  validActions,
  onAction,
  disabled,
  callAmount,
  currentBet,
}: {
  validActions: ValidAction[];
  onAction: (action: PlayerAction, amount?: number) => void;
  disabled: boolean;
  callAmount: number;
  currentBet: number;
}) {
  const [raiseAmount, setRaiseAmount] = useState<number>(0);
  const raiseAction = validActions.find(a => a.action === 'raise');

  // Reset slider when raise range changes (new hand/round)
  useEffect(() => {
    setRaiseAmount(0);
  }, [raiseAction?.minAmount, raiseAction?.maxAmount]);

  const handleRaise = () => {
    if (!raiseAction) return;
    const amount = raiseAmount || raiseAction.minAmount || 0;
    onAction('raise', amount);
  };

  const actionStyles: Record<string, string> = {
    fold: 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200',
    check: 'border-green-300 bg-green-500 text-white hover:bg-green-600',
    call: 'border-blue-300 bg-blue-500 text-white hover:bg-blue-600',
    raise: 'border-amber-400 bg-amber-500 text-white hover:bg-amber-600',
    all_in: 'border-red-400 bg-red-600 text-white hover:bg-red-700',
  };

  const isBet = currentBet === 0;
  const actionLabels: Record<string, string> = {
    fold: 'Fold',
    check: 'Check',
    call: callAmount > 0 ? `Call ${callAmount}` : 'Call',
    raise: isBet ? 'Bet' : 'Raise',
    all_in: 'All In',
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex gap-2 flex-wrap justify-center">
        {validActions.filter(a => a.action !== 'raise').map(a => (
          <button
            key={a.action}
            onClick={() => onAction(a.action)}
            disabled={disabled}
            className={`rounded-xl border-2 px-4 py-2 text-sm font-black shadow transition active:scale-95 disabled:opacity-50 ${actionStyles[a.action]}`}
          >
            {actionLabels[a.action]}
          </button>
        ))}
      </div>
      {raiseAction && (
        <div className="flex items-center gap-2 justify-center">
          <input
            type="range"
            min={raiseAction.minAmount ?? 0}
            max={raiseAction.maxAmount ?? 0}
            value={raiseAmount || raiseAction.minAmount || 0}
            onChange={e => setRaiseAmount(Number(e.target.value))}
            className="w-24 accent-amber-500"
          />
          <span className="text-sm font-black text-amber-700 w-12 text-center">
            {raiseAmount || raiseAction.minAmount || 0}
          </span>
          <button
            onClick={handleRaise}
            disabled={disabled}
            className={`rounded-xl border-2 px-4 py-2 text-sm font-black shadow transition active:scale-95 disabled:opacity-50 ${actionStyles.raise}`}
          >
            {isBet ? 'Bet' : 'Raise'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Seat Positioning ─────────────────────────────────────────────────────────

// Positions as [top%, left%] — human always index 0 (bottom center)
// Others distributed clockwise starting from bottom-left
const SEAT_POSITIONS: Record<number, [number, number][]> = {
  2: [
    [92, 50],   // bottom center (human)
    [2, 50],    // top center
  ],
  3: [
    [92, 50],   // bottom center
    [20, 8],    // top-left
    [20, 92],   // top-right
  ],
  4: [
    [92, 50],   // bottom center
    [50, 2],    // left
    [2, 50],    // top center
    [50, 98],   // right
  ],
  5: [
    [92, 50],   // bottom center
    [70, 4],    // bottom-left
    [15, 8],    // top-left
    [15, 92],   // top-right
    [70, 96],   // bottom-right
  ],
  6: [
    [92, 50],   // bottom center
    [70, 4],    // bottom-left
    [20, 4],    // top-left
    [2, 50],    // top center
    [20, 96],   // top-right
    [70, 96],   // bottom-right
  ],
  7: [
    [92, 50],   // bottom center
    [78, 6],    // lower-left
    [42, 2],    // mid-left
    [10, 20],   // upper-left
    [10, 80],   // upper-right
    [42, 98],   // mid-right
    [78, 94],   // lower-right
  ],
  8: [
    [92, 50],   // bottom center
    [80, 6],    // lower-left
    [48, 2],    // mid-left
    [15, 12],   // upper-left
    [2, 50],    // top center
    [15, 88],   // upper-right
    [48, 98],   // mid-right
    [80, 94],   // lower-right
  ],
  9: [
    [92, 50],   // bottom center
    [82, 6],    // lower-left
    [55, 2],    // mid-left
    [25, 4],    // upper-left
    [5, 28],    // top-left
    [5, 72],    // top-right
    [25, 96],   // upper-right
    [55, 98],   // mid-right
    [82, 94],   // lower-right
  ],
};

// ── PlayerSeat ───────────────────────────────────────────────────────────────

function PlayerSeat({
  player,
  isMe,
  isAction,
  myHoleCards,
  revealedCards,
  isShowdown,
  isWaiting,
  displayName,
  position,
  actionText,
  winnerBestCards,
  isWinner,
  myHandDescription,
}: {
  player: PokerPlayerRow;
  isMe: boolean;
  isAction: boolean;
  myHoleCards: string[];
  revealedCards?: string[];
  isShowdown: boolean;
  isWaiting: boolean;
  displayName: string;
  position: [number, number];
  actionText?: string;
  winnerBestCards?: string[];
  isWinner?: boolean;
  myHandDescription?: string | null;
}) {
  const showHoleCards = isMe && myHoleCards.length > 0 && !isShowdown;
  // At showdown, show revealed cards for players who must show or chose to show
  const showRevealed = isShowdown && revealedCards && revealedCards.length > 0;
  // Human always sees their own hole cards at showdown (private — only they can see)
  const showPrivateAtShowdown = isMe && isShowdown && myHoleCards.length > 0 && !showRevealed;
  const isFoldedOrOut = player.is_folded || player.is_eliminated;

  // Position badge (D / SB / BB)
  let badge = '';
  if (player.is_dealer) badge = 'D';
  else if (player.is_small_blind) badge = 'SB';
  else if (player.is_big_blind) badge = 'BB';

  const isBottom = position[0] > 70;

  return (
    <div
      className="absolute flex flex-col items-center gap-0.5"
      style={{
        top: `${position[0]}%`,
        left: `${position[1]}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: isMe ? 20 : 10,
      }}
    >
      {/* Hole cards — show above seat for bottom, below name for top */}
      {isBottom && (
        <div className="flex gap-0.5 mb-0.5">
          {showHoleCards && myHoleCards.map((card, i) => (
            <CardDisplay key={i} card={card} small highlight={isWinner && winnerBestCards?.includes(card)} />
          ))}
          {showRevealed && revealedCards!.map((card, i) => (
            <CardDisplay key={i} card={card} small highlight={isWinner && winnerBestCards?.includes(card)} />
          ))}
          {showPrivateAtShowdown && myHoleCards.map((card, i) => (
            <CardDisplay key={i} card={card} small />
          ))}
          {!showHoleCards && !showRevealed && !showPrivateAtShowdown && !isShowdown && !isFoldedOrOut && !isWaiting && (
            <>
              <CardDisplay faceDown small />
              <CardDisplay faceDown small />
            </>
          )}
        </div>
      )}

      {/* Seat chip — name, chips, badge */}
      <div
        className={`
          flex flex-col items-center rounded-xl border-2 px-3 py-1.5 min-w-[68px] transition-all
          ${isFoldedOrOut ? 'border-slate-400/40 bg-slate-700/60 opacity-50' : ''}
          ${isAction ? 'border-amber-400 bg-amber-900/80 shadow-[0_0_12px_rgba(251,191,36,0.5)]' : ''}
          ${!isAction && !isFoldedOrOut ? 'border-emerald-300/40 bg-slate-800/80' : ''}
          ${isMe && !isFoldedOrOut ? 'border-blue-400/70 bg-blue-900/70' : ''}
        `}
      >
        <div className="flex items-center gap-1">
          <span className={`text-[11px] font-black truncate max-w-[56px] ${isMe ? 'text-blue-200' : 'text-slate-200'}`}>
            {displayName}
          </span>
          {badge && (
            <span className={`text-[8px] font-black rounded-full px-1 leading-tight ${
              badge === 'D' ? 'bg-white text-slate-900' :
              badge === 'SB' ? 'bg-amber-400 text-amber-900' :
              'bg-amber-500 text-white'
            }`}>
              {badge}
            </span>
          )}
        </div>
        <span className={`text-[11px] font-bold leading-tight ${isFoldedOrOut ? 'text-slate-400' : 'text-yellow-300'}`}>
          {player.is_eliminated ? 'Out' : player.is_folded ? 'Folded' : `${player.chips}`}
        </span>
        {player.is_all_in && !player.is_folded && (
          <span className="text-[8px] font-black text-red-400 leading-tight">ALL IN</span>
        )}
      </div>

      {/* Status text below seat chip — hand description or action */}
      {player.hand_description && isShowdown && (showRevealed || showPrivateAtShowdown) && (
        <span className="text-[9px] font-bold text-green-300 mt-0.5 whitespace-nowrap">{player.hand_description}</span>
      )}
      {isMe && myHandDescription && !isShowdown && !player.is_folded && (
        <span className="text-[9px] font-bold text-emerald-300 mt-0.5 whitespace-nowrap">{myHandDescription}</span>
      )}
      {actionText && !isShowdown && (
        <span className="text-[9px] font-bold text-sky-300 mt-0.5 whitespace-nowrap">{actionText}</span>
      )}

      {/* Bet chip */}
      {player.current_bet > 0 && (
        <div className="rounded-full bg-amber-400 border border-amber-600 px-1.5 py-0 mt-0.5">
          <span className="text-[10px] font-black text-amber-900">{player.current_bet}</span>
        </div>
      )}

      {/* Cards for non-bottom players */}
      {!isBottom && (
        <div className="flex gap-0.5 mt-0.5">
          {showHoleCards && myHoleCards.map((card, i) => (
            <CardDisplay key={i} card={card} small highlight={isWinner && winnerBestCards?.includes(card)} />
          ))}
          {showRevealed && revealedCards!.map((card, i) => (
            <CardDisplay key={i} card={card} small highlight={isWinner && winnerBestCards?.includes(card)} />
          ))}
          {showPrivateAtShowdown && myHoleCards.map((card, i) => (
            <CardDisplay key={i} card={card} small />
          ))}
          {!showHoleCards && !showRevealed && !showPrivateAtShowdown && !isShowdown && !isFoldedOrOut && !isWaiting && (
            <>
              <CardDisplay faceDown small />
              <CardDisplay faceDown small />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main PokerTable ──────────────────────────────────────────────────────────

export interface PokerTableProps {
  players: PokerPlayerRow[];
  communityCards: string[];
  pot: number;
  phase: PokerPhase;
  currentBet: number;
  blindLevel: number;
  blindSmall: number;
  blindBig: number;
  actionOnSeat: number | null;
  myUserId: string | null;
  myHoleCards: string[];
  revealedCards?: Record<string, string[]>;
  validActions: ValidAction[];
  onAction: (action: PlayerAction, amount?: number) => void;
  isMyTurn: boolean;
  handNumber: number;
  lastAction: string | null;
  usernames?: Record<string, string>;
  playerActions?: Record<string, string>;
  winnerBestCards?: string[];
  winnerUserId?: string | null;
  myHandDescription?: string | null;
  nextBlindSmall?: number | null;
  nextBlindBig?: number | null;
  blindTimeLeft?: number | null;
}

export function PokerTable({
  players,
  communityCards,
  pot,
  phase,
  currentBet,
  blindLevel,
  blindSmall,
  blindBig,
  actionOnSeat,
  myUserId,
  myHoleCards,
  revealedCards,
  validActions,
  onAction,
  isMyTurn,
  handNumber,
  lastAction,
  usernames,
  playerActions,
  winnerBestCards,
  winnerUserId,
  myHandDescription,
  nextBlindSmall,
  nextBlindBig,
  blindTimeLeft,
}: PokerTableProps) {
  const isShowdown = phase === 'showdown';
  const isWaiting = phase === 'waiting';
  const myPlayer = players.find(p => p.user_id === myUserId);
  const callAmount = currentBet - (myPlayer?.current_bet ?? 0);

  // Sort players: human first (seat 0), then by seat
  const sorted = [...players].sort((a, b) => {
    if (a.user_id === myUserId) return -1;
    if (b.user_id === myUserId) return 1;
    return a.seat - b.seat;
  });

  const nonEliminated = sorted.filter(p => !p.is_eliminated);
  const totalSeats = Math.max(nonEliminated.length, 2);
  const positions = SEAT_POSITIONS[Math.min(totalSeats, 9)] ?? SEAT_POSITIONS[9];

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm">
      {/* Hand info bar */}
      {!isWaiting && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-400">Hand #{handNumber}</span>
            <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-black text-slate-300 capitalize">{phase}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs font-black text-amber-400">
              Blinds: {blindSmall}/{blindBig}
            </span>
            {nextBlindSmall != null && nextBlindBig != null && blindTimeLeft != null && (
              <span className="text-[10px] font-bold text-slate-400">
                Next {nextBlindSmall}/{nextBlindBig} in {formatTimeLeft(blindTimeLeft)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* The Table */}
      <div className="relative w-full" style={{ paddingBottom: '75%' }}>
        {/* Felt oval */}
        <div
          className="absolute inset-[4%] rounded-[50%] border-4 border-emerald-800 shadow-[inset_0_2px_20px_rgba(0,0,0,0.4),0_4px_12px_rgba(0,0,0,0.3)]"
          style={{
            background: 'radial-gradient(ellipse at 50% 40%, #34d399 0%, #059669 40%, #047857 70%, #065f46 100%)',
          }}
        />

        {/* Inner rail line */}
        <div
          className="absolute inset-[8%] rounded-[50%] border-2 border-emerald-400/20"
        />

        {/* Center content: pot + community cards */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1" style={{ zIndex: 5 }}>
          {/* Pot */}
          {!isWaiting && pot > 0 && (
            <div className="rounded-full bg-black/30 backdrop-blur-sm px-3 py-0.5 border border-amber-400/30">
              <span className="text-xs font-black text-amber-300">Pot: {pot}</span>
            </div>
          )}

          {/* Community cards */}
          {!isWaiting && (
            <div className="flex gap-1">
              {communityCards.map((card, i) => (
                <CardDisplay key={i} card={card} small highlight={isShowdown && winnerBestCards?.includes(card)} />
              ))}
              {phase !== 'showdown' && Array.from({ length: 5 - communityCards.length }, (_, i) => (
                <div key={`e-${i}`} className="w-7 h-10 rounded-lg border border-dashed border-emerald-400/30" />
              ))}
            </div>
          )}

          {/* Winner's winning hand label */}
          {isShowdown && winnerUserId && winnerBestCards && winnerBestCards.length > 0 && (
            <div className="rounded-full bg-amber-500/90 px-3 py-0.5 border border-amber-300">
              <span className="text-[10px] font-black text-white">
                {usernames?.[winnerUserId] ?? 'Winner'} wins
              </span>
            </div>
          )}
        </div>

        {/* Player seats */}
        {nonEliminated.map((player, i) => {
          const isMe = player.user_id === myUserId;
          const isAction = player.seat === actionOnSeat && !isShowdown;
          const displayName = isMe ? 'You' : usernames?.[player.user_id] ?? `Seat ${player.seat + 1}`;
          const pos = positions[i] ?? positions[positions.length - 1];

          return (
            <PlayerSeat
              key={player.id || player.user_id}
              player={player}
              isMe={isMe}
              isAction={isAction}
              myHoleCards={isMe ? myHoleCards : []}
              revealedCards={revealedCards?.[player.user_id]}
              isShowdown={isShowdown}
              isWaiting={isWaiting}
              displayName={displayName}
              position={pos}
              actionText={playerActions?.[player.user_id]}
              winnerBestCards={winnerBestCards}
              isWinner={player.user_id === winnerUserId}
              myHandDescription={isMe ? myHandDescription : null}
            />
          );
        })}
      </div>

      {/* Action buttons */}
      {isMyTurn && validActions.length > 0 && !isShowdown && (
        <div className="mt-1">
          <p className="text-center text-sm font-black text-blue-400 mb-2">Your turn!</p>
          <ActionButtons
            validActions={validActions}
            onAction={onAction}
            disabled={false}
            callAmount={callAmount}
            currentBet={currentBet}
          />
        </div>
      )}

      {/* Waiting status */}
      {!isMyTurn && !isShowdown && !isWaiting && actionOnSeat !== null && (
        <p className="text-center text-sm font-semibold text-slate-400">
          Waiting for {usernames?.[players.find(p => p.seat === actionOnSeat)?.user_id ?? ''] ?? `Seat ${actionOnSeat + 1}`}…
        </p>
      )}
    </div>
  );
}
