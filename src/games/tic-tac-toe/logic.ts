import type { CellValue, PlayerSymbol } from './types';

export const WIN_LINES: readonly [number, number, number][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],             // diagonals
];

/**
 * Check the board state.
 * Returns 'X' or 'O' if that player has won, 'draw' if the board is full
 * with no winner, or null if the game is still in progress.
 */
export function checkWinner(b: CellValue[]): PlayerSymbol | 'draw' | null {
  for (const [a, x, c] of WIN_LINES) {
    if (b[a] && b[a] === b[x] && b[a] === b[c]) return b[a] as PlayerSymbol;
  }
  return b.every(v => v !== '') ? 'draw' : null;
}

/**
 * Minimax algorithm parameterised by which symbol the AI controls.
 * Returns a score: +10 for AI win, -10 for human win, 0 for draw.
 */
export function minimax(board: CellValue[], isMaximizing: boolean, ai: PlayerSymbol): number {
  const human: PlayerSymbol = ai === 'X' ? 'O' : 'X';
  const result = checkWinner(board);
  if (result === ai) return 10;
  if (result === human) return -10;
  if (result === 'draw') return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === '') {
        board[i] = ai;
        best = Math.max(best, minimax(board, false, ai));
        board[i] = '';
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === '') {
        board[i] = human;
        best = Math.min(best, minimax(board, true, ai));
        board[i] = '';
      }
    }
    return best;
  }
}

/**
 * Returns the index of the best move for the AI, or -1 if no moves are available.
 */
export function getBestMove(board: CellValue[], ai: PlayerSymbol): number {
  let bestVal = -Infinity;
  let bestMove = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i] === '') {
      board[i] = ai;
      const val = minimax(board, false, ai);
      board[i] = '';
      if (val > bestVal) {
        bestVal = val;
        bestMove = i;
      }
    }
  }
  return bestMove;
}

/** Creates a fresh empty 9-cell board. */
export function createEmptyBoard(): CellValue[] {
  return Array(9).fill('');
}
