export type CellValue = 0 | 1 | 2 | 3 | 4;
// 0=empty, 1=P1 piece (Red), 2=P2 piece (Black), 3=P1 king, 4=P2 king

export type PlayerNumber = 1 | 2;
export type GameStatus = 'waiting' | 'active' | 'p1_wins' | 'p2_wins' | 'draw' | 'cancelled';

export interface CheckersGameRow {
  id: string;
  player_1: string;
  player_2: string | null;
  board: CellValue[];        // 64-element flat array, index = row*8+col
  current_turn: PlayerNumber;
  status: GameStatus;
  created_at: string;
  updated_at: string;
}

export interface CheckersMove {
  from: number;       // start board index
  to: number;         // final board index (after full sequence)
  jumped: number[];   // captured piece indices in order (multi-jump)
}
