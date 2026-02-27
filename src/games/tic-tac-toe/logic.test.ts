/**
 * Unit tests for tic-tac-toe game logic.
 *
 * Test strategy:
 * - checkWinner: all 8 winning lines for both X and O, draw detection,
 *   in-progress detection, edge cases (empty board, nearly-full board).
 * - minimax: terminal state scoring, preference for winning over drawing.
 * - getBestMove: takes winning move, blocks opponent's winning move,
 *   optimal play from empty and near-empty boards.
 * - createEmptyBoard: returns correct shape and values.
 * - WIN_LINES: structural correctness.
 */

import { describe, it, expect } from 'vitest';
import {
  checkWinner,
  minimax,
  getBestMove,
  createEmptyBoard,
  WIN_LINES,
} from './logic';
import type { CellValue, PlayerSymbol } from './types';

// ---------------------------------------------------------------------------
// Helper to build a board from a compact string.
// Each character: X, O, or _ (empty).
// Example: 'XOX_O__X_' -> ['X','O','X','','O','','','X','']
// ---------------------------------------------------------------------------
function board(s: string): CellValue[] {
  return s.split('').map(c => (c === '_' ? '' : c)) as CellValue[];
}

// ===========================================================================
// WIN_LINES
// ===========================================================================
describe('WIN_LINES', () => {
  it('should contain exactly 8 winning combinations', () => {
    expect(WIN_LINES).toHaveLength(8);
  });

  it('should contain all three rows', () => {
    expect(WIN_LINES).toContainEqual([0, 1, 2]);
    expect(WIN_LINES).toContainEqual([3, 4, 5]);
    expect(WIN_LINES).toContainEqual([6, 7, 8]);
  });

  it('should contain all three columns', () => {
    expect(WIN_LINES).toContainEqual([0, 3, 6]);
    expect(WIN_LINES).toContainEqual([1, 4, 7]);
    expect(WIN_LINES).toContainEqual([2, 5, 8]);
  });

  it('should contain both diagonals', () => {
    expect(WIN_LINES).toContainEqual([0, 4, 8]);
    expect(WIN_LINES).toContainEqual([2, 4, 6]);
  });

  it('should only reference valid board indices (0-8)', () => {
    for (const line of WIN_LINES) {
      for (const idx of line) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThanOrEqual(8);
      }
    }
  });
});

// ===========================================================================
// createEmptyBoard
// ===========================================================================
describe('createEmptyBoard', () => {
  it('should return an array of 9 empty strings', () => {
    const b = createEmptyBoard();
    expect(b).toHaveLength(9);
    expect(b.every(v => v === '')).toBe(true);
  });

  it('should return a new array each time (not a shared reference)', () => {
    const a = createEmptyBoard();
    const b = createEmptyBoard();
    expect(a).not.toBe(b);
    a[0] = 'X';
    expect(b[0]).toBe('');
  });
});

// ===========================================================================
// checkWinner
// ===========================================================================
describe('checkWinner', () => {
  describe('X wins', () => {
    it.each([
      ['top row',    'XXX______'],
      ['middle row', '___XXX___'],
      ['bottom row', '______XXX'],
      ['left col',   'X__X__X__'],
      ['mid col',    '_X__X__X_'],
      ['right col',  '__X__X__X'],
      ['diag \\',    'X___X___X'],
      ['diag /',     '__X_X_X__'],
    ])('should detect X winning via %s', (_label, layout) => {
      expect(checkWinner(board(layout))).toBe('X');
    });
  });

  describe('O wins', () => {
    it.each([
      ['top row',    'OOO______'],
      ['middle row', '___OOO___'],
      ['bottom row', '______OOO'],
      ['left col',   'O__O__O__'],
      ['mid col',    '_O__O__O_'],
      ['right col',  '__O__O__O'],
      ['diag \\',    'O___O___O'],
      ['diag /',     '__O_O_O__'],
    ])('should detect O winning via %s', (_label, layout) => {
      expect(checkWinner(board(layout))).toBe('O');
    });
  });

  describe('draw', () => {
    it('should detect a draw when the board is full with no winner', () => {
      // Classic draw: XOXXOXOXO
      expect(checkWinner(board('XOXXOXOXO'))).toBe('draw');
    });

    it('should detect a draw for another full board configuration', () => {
      // XOX / OXO / OXO — no three in a row
      expect(checkWinner(board('XOXOXOOXO'))).toBe('draw');
    });
  });

  describe('in-progress (returns null)', () => {
    it('should return null for an empty board', () => {
      expect(checkWinner(createEmptyBoard())).toBeNull();
    });

    it('should return null when only one move has been made', () => {
      expect(checkWinner(board('X________'))).toBeNull();
    });

    it('should return null for a partially filled board with no winner', () => {
      expect(checkWinner(board('XO_XO____'))).toBeNull();
    });

    it('should return null when the board is nearly full but no winner yet', () => {
      // XOXXOX_XO — one empty cell, no winner yet
      expect(checkWinner(board('XOXXOX_XO'))).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should detect a win even when the board is completely full', () => {
      // Full board where X wins via top row: XXX OXO OOX
      expect(checkWinner(board('XXXOXOOOX'))).toBe('X');
    });

    it('should detect the first winning line found (X wins despite O also having three in a row is impossible in valid play, but logic checks sequentially)', () => {
      // X wins top row
      const b = board('XXXOO____');
      expect(checkWinner(b)).toBe('X');
    });
  });
});

// ===========================================================================
// minimax
// ===========================================================================
describe('minimax', () => {
  it('should return +10 when the AI has already won', () => {
    // AI is O, O wins bottom row
    const b = board('XX_OOO___');
    expect(minimax(b, true, 'O')).toBe(10);
  });

  it('should return -10 when the human has already won', () => {
    // AI is O, X wins top row
    const b = board('XXXOO____');
    expect(minimax(b, true, 'O')).toBe(-10);
  });

  it('should return 0 for a drawn board', () => {
    const b = board('XOXXOXOXO');
    expect(minimax(b, true, 'X')).toBe(0);
    expect(minimax(b, true, 'O')).toBe(0);
  });

  it('should score a position where AI can win on the next move as +10', () => {
    // AI is X, X has top-left and top-mid, top-right is empty -> X can win
    // Board: XX_ / OO_ / ___
    const b = board('XX_OO____');
    // AI (X) is maximizing; should find the winning move
    expect(minimax(b, true, 'X')).toBe(10);
  });

  it('should not mutate the board array', () => {
    const b = board('XX_OO____');
    const copy = [...b];
    minimax(b, true, 'X');
    expect(b).toEqual(copy);
  });
});

// ===========================================================================
// getBestMove
// ===========================================================================
describe('getBestMove', () => {
  it('should return -1 when the board is completely full', () => {
    const b = board('XOXXOXOXO');
    expect(getBestMove(b, 'X')).toBe(-1);
  });

  it('should take the winning move when one is available', () => {
    // AI is X, X has positions 0 and 1 → should pick 2 to win the row
    const b = board('XX_OO____');
    expect(getBestMove(b, 'X')).toBe(2);
  });

  it('should block the opponent from winning', () => {
    // AI is O. X has positions 0 and 1 → O must block position 2
    // Board: XX_ / OO_ / ___  — but O also has a winning move at 5.
    // Since O can win at 5, the AI will prefer winning over blocking.
    // Let's use a board where O can only block, not win:
    // Board: XX_ / O__ / O__
    const b = board('XX_O__O__');
    expect(getBestMove(b, 'O')).toBe(2);
  });

  it('should prefer winning over blocking when both are possible', () => {
    // AI is O. O can win at position 2 (row: 0,1,2 = O,O,_)
    // X threatens at position 8 (col: 2,5,8 = X,X,_)
    // Board: OO_ / _XX / ___
    const b = board('OO__XX___');
    const move = getBestMove(b, 'O');
    expect(move).toBe(2); // O wins immediately rather than blocking
  });

  it('should pick the only remaining cell when one cell is left', () => {
    // One cell empty at position 6
    const b = board('XOXXOX_XO');
    expect(getBestMove(b, 'O')).toBe(6);
  });

  it('should return a valid index (0-8) from an empty board', () => {
    const move = getBestMove(createEmptyBoard(), 'X');
    expect(move).toBeGreaterThanOrEqual(0);
    expect(move).toBeLessThanOrEqual(8);
  });

  it('should not mutate the board array', () => {
    const b = board('XX_OO____');
    const copy = [...b];
    getBestMove(b, 'X');
    expect(b).toEqual(copy);
  });

  describe('AI never loses with optimal play', () => {
    // Simulate a full game where both sides play optimally (minimax vs minimax).
    // The result should always be a draw.
    function playOptimalGame(firstPlayer: PlayerSymbol): PlayerSymbol | 'draw' {
      const b = createEmptyBoard();
      let current: PlayerSymbol = firstPlayer;
      for (let turn = 0; turn < 9; turn++) {
        const move = getBestMove(b, current);
        if (move === -1) break;
        b[move] = current;
        const result = checkWinner(b);
        if (result === 'X' || result === 'O') return result;
        if (result === 'draw') return 'draw';
        current = current === 'X' ? 'O' : 'X';
      }
      return checkWinner(b) ?? 'draw';
    }

    it('should draw when AI plays X (first) against optimal opponent', () => {
      expect(playOptimalGame('X')).toBe('draw');
    });

    it('should draw when AI plays O (second) against optimal opponent', () => {
      expect(playOptimalGame('O')).toBe('draw');
    });
  });

  describe('AI wins or draws against all possible single human moves from empty board', () => {
    // For every possible first move by the human (X), the AI (O) should
    // never lose when playing optimally for the rest of the game.
    it('should never lose as O regardless of where X plays first', () => {
      for (let firstMove = 0; firstMove < 9; firstMove++) {
        const b = createEmptyBoard();
        b[firstMove] = 'X';
        let current: PlayerSymbol = 'O';
        for (let turn = 1; turn < 9; turn++) {
          const move = getBestMove(b, current);
          if (move === -1) break;
          b[move] = current;
          const result = checkWinner(b);
          if (result === 'X' || result === 'O' || result === 'draw') {
            expect(result).not.toBe('X');
            break;
          }
          current = current === 'X' ? 'O' : 'X';
        }
      }
    });
  });
});
