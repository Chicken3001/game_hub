'use client';

import { useState } from 'react';
import {
  SUIT_SYMBOLS, SUIT_COLORS, RANK_DISPLAY,
  type PokerPlayerRow, type PokerPhase, type ValidAction, type PlayerAction,
} from './types';

// ── CardDisplay ──────────────────────────────────────────────────────────────

function CardDisplay({ card, faceDown, small }: { card?: string; faceDown?: boolean; small?: boolean }) {
  if (faceDown || !card) {
    return (
      <div className={`${small ? 'w-8 h-11' : 'w-10 h-14'} rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-400 shadow-md flex items-center justify-center`}>
        <span className={`${small ? 'text-xs' : 'text-sm'} text-blue-200 font-black`}>?</span>
      </div>
    );
  }

  const rank = card[0] as keyof typeof RANK_DISPLAY;
  const suit = card[1] as keyof typeof SUIT_SYMBOLS;
  const color = SUIT_COLORS[suit] ?? 'text-slate-800';

  return (
    <div className={`${small ? 'w-8 h-11' : 'w-10 h-14'} rounded-lg bg-white border-2 border-slate-200 shadow-md flex flex-col items-center justify-center ${color}`}>
      <span className={`${small ? 'text-xs' : 'text-sm'} font-black leading-none`}>{RANK_DISPLAY[rank]}</span>
      <span className={`${small ? 'text-xs' : 'text-sm'} leading-none`}>{SUIT_SYMBOLS[suit]}</span>
    </div>
  );
}

// ── ActionButtons ────────────────────────────────────────────────────────────

function ActionButtons({
  validActions,
  onAction,
  disabled,
}: {
  validActions: ValidAction[];
  onAction: (action: PlayerAction, amount?: number) => void;
  disabled: boolean;
}) {
  const [raiseAmount, setRaiseAmount] = useState<number>(0);
  const raiseAction = validActions.find(a => a.action === 'raise');

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

  const actionLabels: Record<string, string> = {
    fold: 'Fold',
    check: 'Check',
    call: 'Call',
    raise: 'Raise',
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
            Raise
          </button>
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
  revealedCards?: Record<string, string[]>; // userId → cards (for showdown in VS Computer)
  validActions: ValidAction[];
  onAction: (action: PlayerAction, amount?: number) => void;
  isMyTurn: boolean;
  handNumber: number;
  lastAction: string | null;
  usernames?: Record<string, string>;
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
}: PokerTableProps) {
  const isShowdown = phase === 'showdown';
  const isWaiting = phase === 'waiting';

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm">
      {/* Hand info */}
      {!isWaiting && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-400">Hand #{handNumber}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-500 capitalize">{phase}</span>
          </div>
          <div className="text-xs font-black text-amber-600">
            Blinds: {blindSmall}/{blindBig}
          </div>
        </div>
      )}

      {/* Pot */}
      {!isWaiting && pot > 0 && (
        <div className="text-center">
          <span className="rounded-full bg-amber-100 border border-amber-300 px-4 py-1.5 text-sm font-black text-amber-700 shadow-sm">
            Pot: {pot}
          </span>
        </div>
      )}

      {/* Community cards */}
      {!isWaiting && communityCards.length > 0 && (
        <div className="flex justify-center gap-1.5">
          {communityCards.map((card, i) => (
            <CardDisplay key={i} card={card} />
          ))}
          {/* Placeholder slots for unrevealed community cards */}
          {Array.from({ length: 5 - communityCards.length }, (_, i) => (
            <div key={`empty-${i}`} className="w-10 h-14 rounded-lg border-2 border-dashed border-slate-200" />
          ))}
        </div>
      )}

      {/* Players list */}
      <div className="flex flex-col gap-1.5">
        {players
          .sort((a, b) => a.seat - b.seat)
          .map(player => {
            const isMe = player.user_id === myUserId;
            const isAction = player.seat === actionOnSeat && !isShowdown;
            const showHoleCards = isMe && myHoleCards.length > 0;
            const showRevealed = isShowdown && revealedCards?.[player.user_id];
            const displayName = isMe ? 'You' : usernames?.[player.user_id] ?? `Seat ${player.seat + 1}`;

            return (
              <div
                key={player.id || player.user_id}
                className={`
                  flex items-center gap-2 rounded-xl border-2 px-3 py-2 transition-all
                  ${player.is_eliminated ? 'border-slate-200 bg-slate-50 opacity-50' : ''}
                  ${player.is_folded && !player.is_eliminated ? 'border-slate-200 bg-slate-50 opacity-60' : ''}
                  ${isAction ? 'border-amber-400 bg-amber-50 shadow-md' : ''}
                  ${!isAction && !player.is_folded && !player.is_eliminated ? 'border-slate-200 bg-white shadow-sm' : ''}
                  ${isMe && !player.is_folded && !player.is_eliminated ? 'border-blue-300 bg-blue-50' : ''}
                `}
              >
                {/* Seat badges */}
                <div className="flex flex-col items-center gap-0.5 w-6 shrink-0">
                  <span className="text-xs font-black text-slate-400">{player.seat + 1}</span>
                  {player.is_dealer && <span className="text-xs" title="Dealer">D</span>}
                  {player.is_small_blind && <span className="text-[10px] text-amber-500 font-black">SB</span>}
                  {player.is_big_blind && <span className="text-[10px] text-amber-600 font-black">BB</span>}
                </div>

                {/* Player info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-black truncate ${isMe ? 'text-blue-700' : 'text-slate-800'}`}>
                      {displayName}
                    </span>
                    {player.is_eliminated && <span className="text-xs text-slate-400">(out)</span>}
                    {player.is_folded && !player.is_eliminated && <span className="text-xs text-slate-400">(folded)</span>}
                    {player.is_all_in && !player.is_folded && <span className="text-xs font-black text-red-500">ALL IN</span>}
                  </div>
                  {player.hand_description && isShowdown && !player.is_folded && (
                    <span className="text-xs font-semibold text-green-600">{player.hand_description}</span>
                  )}
                </div>

                {/* Hole cards */}
                <div className="flex gap-0.5 shrink-0">
                  {showHoleCards && myHoleCards.map((card, i) => (
                    <CardDisplay key={i} card={card} small />
                  ))}
                  {showRevealed && revealedCards![player.user_id].map((card, i) => (
                    <CardDisplay key={i} card={card} small />
                  ))}
                  {player.show_cards && !showHoleCards && !showRevealed && isShowdown && (
                    <span className="text-xs text-slate-400">shown</span>
                  )}
                  {!showHoleCards && !showRevealed && !isShowdown && !player.is_folded && !player.is_eliminated && !isWaiting && (
                    <>
                      <CardDisplay faceDown small />
                      <CardDisplay faceDown small />
                    </>
                  )}
                </div>

                {/* Chips & bet */}
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-sm font-black text-slate-700">{player.chips}</span>
                  {player.current_bet > 0 && (
                    <span className="text-xs font-semibold text-amber-600">bet {player.current_bet}</span>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Action buttons */}
      {isMyTurn && validActions.length > 0 && !isShowdown && (
        <div className="pt-2">
          <p className="text-center text-sm font-black text-blue-700 mb-2">Your turn!</p>
          <ActionButtons
            validActions={validActions}
            onAction={onAction}
            disabled={false}
          />
        </div>
      )}

      {/* Status line when not my turn */}
      {!isMyTurn && !isShowdown && !isWaiting && actionOnSeat !== null && (
        <p className="text-center text-sm font-semibold text-slate-500">
          Waiting for Seat {actionOnSeat + 1}…
        </p>
      )}
    </div>
  );
}
