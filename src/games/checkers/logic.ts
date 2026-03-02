import type { CellValue, PlayerNumber, CheckersMove } from './types';

export const ROWS = 8;
export const COLS = 8;

// ── Board helpers ─────────────────────────────────────────────────────────────

export function rowCol(idx: number): [number, number] {
  return [Math.floor(idx / COLS), idx % COLS];
}

export function isDark(idx: number): boolean {
  const [row, col] = rowCol(idx);
  return (row + col) % 2 === 1;
}

export function isPlayerPiece(cell: CellValue, player: PlayerNumber): boolean {
  return player === 1 ? (cell === 1 || cell === 3) : (cell === 2 || cell === 4);
}

export function isKing(cell: CellValue): boolean {
  return cell === 3 || cell === 4;
}

export function ownerOf(cell: CellValue): PlayerNumber | null {
  if (cell === 1 || cell === 3) return 1;
  if (cell === 2 || cell === 4) return 2;
  return null;
}

// Diagonal move directions valid for a given cell value
function getMoveDirections(cell: CellValue): [number, number][] {
  if (cell === 1) return [[-1, -1], [-1, 1]];           // P1: moves up (row decreases)
  if (cell === 2) return [[1, -1], [1, 1]];             // P2: moves down (row increases)
  return [[-1, -1], [-1, 1], [1, -1], [1, 1]];         // King: all diagonals
}

// ── Initial board ─────────────────────────────────────────────────────────────
// P2 (value=2) on dark squares of rows 0-2 (top)
// P1 (value=1) on dark squares of rows 5-7 (bottom)
// Dark square: (row + col) % 2 === 1

function buildInitialBoard(): CellValue[] {
  const board: CellValue[] = Array(64).fill(0) as CellValue[];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if ((row + col) % 2 === 1) {
        const idx = row * COLS + col;
        if (row < 3) board[idx] = 2;
        else if (row > 4) board[idx] = 1;
      }
    }
  }
  return board;
}

export const INITIAL_BOARD: CellValue[] = buildInitialBoard();

// ── Move generation ───────────────────────────────────────────────────────────

/** Immediate single-hop jump destinations from one piece (one hop only). */
export function getImmediateJumps(
  board: CellValue[],
  pieceIdx: number,
  player: PlayerNumber
): Array<{ to: number; jumped: number }> {
  const cell = board[pieceIdx];
  if (!isPlayerPiece(cell, player)) return [];
  const [row, col] = rowCol(pieceIdx);
  const dirs = getMoveDirections(cell);
  const result: Array<{ to: number; jumped: number }> = [];
  const opp: PlayerNumber = player === 1 ? 2 : 1;

  for (const [dr, dc] of dirs) {
    const midRow = row + dr, midCol = col + dc;
    const landRow = row + 2 * dr, landCol = col + 2 * dc;

    if (midRow < 0 || midRow >= ROWS || midCol < 0 || midCol >= COLS) continue;
    if (landRow < 0 || landRow >= ROWS || landCol < 0 || landCol >= COLS) continue;

    const midIdx = midRow * COLS + midCol;
    const landIdx = landRow * COLS + landCol;

    if (!isPlayerPiece(board[midIdx], opp)) continue;
    if (board[landIdx] !== 0) continue;

    result.push({ to: landIdx, jumped: midIdx });
  }
  return result;
}

/** Simple diagonal step destinations from one piece (no capture). */
export function getStepMoves(
  board: CellValue[],
  pieceIdx: number,
  player: PlayerNumber
): number[] {
  const cell = board[pieceIdx];
  if (!isPlayerPiece(cell, player)) return [];
  const [row, col] = rowCol(pieceIdx);
  const dirs = getMoveDirections(cell);
  const result: number[] = [];

  for (const [dr, dc] of dirs) {
    const newRow = row + dr, newCol = col + dc;
    if (newRow < 0 || newRow >= ROWS || newCol < 0 || newCol >= COLS) continue;
    const newIdx = newRow * COLS + newCol;
    if (board[newIdx] === 0) result.push(newIdx);
  }
  return result;
}

/**
 * All complete jump sequences starting from a piece (recursive multi-jump).
 * If the piece gets kinged mid-sequence, the sequence ends there.
 */
export function getAllJumpSequences(
  board: CellValue[],
  fromIdx: number,
  player: PlayerNumber
): CheckersMove[] {
  function recurse(
    currentBoard: CellValue[],
    currentIdx: number,
    jumped: number[]
  ): CheckersMove[] {
    const currentCell = currentBoard[currentIdx];
    const immediateJumps = getImmediateJumps(currentBoard, currentIdx, player)
      .filter(j => !jumped.includes(j.jumped));

    if (immediateJumps.length === 0) {
      if (jumped.length === 0) return [];
      return [{ from: fromIdx, to: currentIdx, jumped }];
    }

    const results: CheckersMove[] = [];
    for (const { to, jumped: midIdx } of immediateJumps) {
      const tempBoard = currentBoard.slice() as CellValue[];
      tempBoard[to] = currentCell;
      tempBoard[currentIdx] = 0;
      tempBoard[midIdx] = 0;

      const [toRow] = rowCol(to);
      const kinged =
        (player === 1 && toRow === 0 && currentCell === 1) ||
        (player === 2 && toRow === 7 && currentCell === 2);

      if (kinged) {
        // Getting kinged ends the jump sequence
        tempBoard[to] = player === 1 ? 3 : 4;
        results.push({ from: fromIdx, to, jumped: [...jumped, midIdx] });
      } else {
        results.push(...recurse(tempBoard, to, [...jumped, midIdx]));
      }
    }
    return results;
  }

  return recurse(board, fromIdx, []);
}

/**
 * All valid moves for a player (respects mandatory capture).
 * If any jump exists → returns only jump sequences (all pieces).
 * Otherwise → returns all step moves (all pieces).
 */
export function getValidMoves(board: CellValue[], player: PlayerNumber): CheckersMove[] {
  const allJumps: CheckersMove[] = [];
  const allSteps: CheckersMove[] = [];

  for (let i = 0; i < 64; i++) {
    if (!isPlayerPiece(board[i], player)) continue;
    allJumps.push(...getAllJumpSequences(board, i, player));
  }

  if (allJumps.length > 0) return allJumps;

  for (let i = 0; i < 64; i++) {
    if (!isPlayerPiece(board[i], player)) continue;
    for (const to of getStepMoves(board, i, player)) {
      allSteps.push({ from: i, to, jumped: [] });
    }
  }
  return allSteps;
}

// ── Move application ──────────────────────────────────────────────────────────

/** Returns new board after applying a complete move (removes jumped pieces, promotes kings). */
export function applyMove(board: CellValue[], move: CheckersMove): CellValue[] {
  const newBoard = board.slice() as CellValue[];
  const piece = newBoard[move.from];

  newBoard[move.to] = piece;
  newBoard[move.from] = 0;

  for (const jumped of move.jumped) {
    newBoard[jumped] = 0;
  }

  // Promote to king
  const [toRow] = rowCol(move.to);
  if (piece === 1 && toRow === 0) newBoard[move.to] = 3;
  if (piece === 2 && toRow === 7) newBoard[move.to] = 4;

  return newBoard;
}

// ── Position key ──────────────────────────────────────────────────────────────

/**
 * Serialize board + whose turn into a compact position key for repetition tracking.
 */
export function boardKey(board: CellValue[], turn: PlayerNumber): string {
  return board.join('') + turn;
}

// ── Win detection ─────────────────────────────────────────────────────────────

/**
 * Call after a move, passing the NEXT player to move.
 * Returns the winner's PlayerNumber, or null if game continues.
 */
export function checkWinner(board: CellValue[], nextPlayer: PlayerNumber): PlayerNumber | null {
  const opp: PlayerNumber = nextPlayer === 1 ? 2 : 1;
  const hasPieces = board.some(c => isPlayerPiece(c, nextPlayer));
  if (!hasPieces) return opp;
  const hasMoves = getValidMoves(board, nextPlayer).length > 0;
  if (!hasMoves) return opp;
  return null;
}
