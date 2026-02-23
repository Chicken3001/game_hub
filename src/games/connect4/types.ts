export type CellValue = 0 | 1 | 2;   // 0=empty, 1=P1 (red), 2=P2 (yellow)
export type PlayerNumber = 1 | 2;
export type GameStatus = 'waiting' | 'active' | 'p1_wins' | 'p2_wins' | 'draw' | 'cancelled';

export interface Connect4GameRow {
  id: string;
  player_1: string;
  player_2: string | null;
  board: CellValue[];        // 42-element
  current_turn: PlayerNumber;
  status: GameStatus;
  created_at: string;
  updated_at: string;
}
