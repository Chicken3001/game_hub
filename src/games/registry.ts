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
    name: "Animal Memory Match",
    description: "Flip the cards and find all the matching pairs from memory!",
    path: "/games/farm-match",
    icon: "🧠",
  },
  {
    id: "number-guess",
    name: "Number Guessing",
    description: "I'm thinking of a number—can you guess it?",
    path: "/games/number-guess",
    icon: "🔢",
  },
  {
    id: "animal-match",
    name: "Animal Match",
    description: "Tap or drag to connect matching animal pairs!",
    path: "/games/animal-match",
    icon: "🐾",
  },
];
