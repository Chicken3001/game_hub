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
    description: "Flip the cards and find the matching animal pairs!",
    path: "/games/farm-match",
    icon: "🐄",
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
    name: "Tap to Match Animals",
    description: "Pick farm or wild animals, then tap to match pairs!",
    path: "/games/animal-match",
    icon: "🐾",
  },
];
