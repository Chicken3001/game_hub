export interface GameEntry {
  id: string;
  name: string;
  description: string;
  path: string;
  icon?: string;
}

export const GAMES: GameEntry[] = [
  {
    id: "farm-match",
    name: "Farm Animal Match",
    description: "Match the farm animal pairs!",
    path: "/games/farm-match",
    icon: "🐄",
  },
  {
    id: "number-guess",
    name: "Number Guessing",
    description: "Guess the number between 1 and 100.",
    path: "/games/number-guess",
    icon: "🔢",
  },
];
