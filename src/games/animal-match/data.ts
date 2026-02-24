export interface Animal {
  emoji: string;
  name: string;
  color: string;
}

export interface AnimalSet {
  id: string;
  name: string;
  icon: string;
  animals: Animal[];
}

export const ANIMAL_SETS: AnimalSet[] = [
  {
    id: "farm",
    name: "Farm Animals",
    icon: "🐄",
    animals: [
      { emoji: "🐄", name: "Cow", color: "#7B5C3A" },
      { emoji: "🐷", name: "Pig", color: "#D4607A" },
      { emoji: "🐔", name: "Chicken", color: "#C0811A" },
      { emoji: "🐑", name: "Sheep", color: "#7C9EC0" },
      { emoji: "🐴", name: "Horse", color: "#8B5E3C" },
      { emoji: "🐐", name: "Goat", color: "#7A9A5A" },
    ],
  },
  {
    id: "pets",
    name: "Pets",
    icon: "🐾",
    animals: [
      { emoji: "🐶", name: "Dog", color: "#A0522D" },
      { emoji: "🐱", name: "Cat", color: "#E07A30" },
      { emoji: "🐰", name: "Rabbit", color: "#C084C4" },
      { emoji: "🐹", name: "Hamster", color: "#D4A96A" },
      { emoji: "🐠", name: "Fish", color: "#2196F3" },
      { emoji: "🦜", name: "Parrot", color: "#16A34A" },
    ],
  },
  {
    id: "zoo",
    name: "Zoo Animals",
    icon: "🦁",
    animals: [
      { emoji: "🦁", name: "Lion", color: "#CA8A04" },
      { emoji: "🐘", name: "Elephant", color: "#6B7FA3" },
      { emoji: "🦒", name: "Giraffe", color: "#D97706" },
      { emoji: "🦓", name: "Zebra", color: "#6B7280" },
      { emoji: "🐒", name: "Monkey", color: "#92400E" },
      { emoji: "🐧", name: "Penguin", color: "#1E40AF" },
    ],
  },
  {
    id: "jungle",
    name: "Jungle Animals",
    icon: "🐯",
    animals: [
      { emoji: "🐯", name: "Tiger", color: "#EA580C" },
      { emoji: "🦍", name: "Gorilla", color: "#57534E" },
      { emoji: "🐊", name: "Crocodile", color: "#15803D" },
      { emoji: "🐍", name: "Snake", color: "#0D9488" },
      { emoji: "🐸", name: "Frog", color: "#65A30D" },
      { emoji: "🐆", name: "Leopard", color: "#D97706" },
    ],
  },
];

const PAIR_COLORS = [
  "#81C784",
  "#FFB74D",
  "#F06292",
  "#64B5F6",
  "#FFD54F",
  "#BA68C8",
];

export function getPairColor(index: number): string {
  return PAIR_COLORS[index % PAIR_COLORS.length];
}
