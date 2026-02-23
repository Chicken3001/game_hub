export interface GameEntry {
  id: string;
  name: string;
  description: string;
  path: string;
  icon?: string;
}

export const GAMES: GameEntry[] = [
  {
    id: "find-animal",
    name: "Find the Animal!",
    description: "Can you spot the right animal? Tap it to find all 6!",
    path: "/games/find-animal",
    icon: "🔍",
  },
  {
    id: "bubble-pop",
    name: "Bubble Pop!",
    description: "Tap the floating bubbles before they float away!",
    path: "/games/bubble-pop",
    icon: "🫧",
  },
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
  {
    id: "shape-sorter",
    name: "Shape Sorter",
    description: "Drag each shape into the right bin — can you sort them all?",
    path: "/games/shape-sorter",
    icon: "🔷",
  },
  {
    id: "tic-tac-toe",
    name: "Tic-Tac-Toe",
    description: "Challenge a friend! Share a link and play in real time.",
    path: "/games/tic-tac-toe",
    icon: "❌",
  },
];
