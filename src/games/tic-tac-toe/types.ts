export type CellValue = '' | 'X' | 'O';
export type GameStatus = 'waiting' | 'active' | 'x_wins' | 'o_wins' | 'draw' | 'cancelled';
export type PlayerSymbol = 'X' | 'O';

export interface TicTacToeGameRow {
  id: string;
  player_x: string;
  player_o: string | null;
  board: CellValue[];
  current_turn: PlayerSymbol;
  status: GameStatus;
  created_at: string;
  updated_at: string;
}
