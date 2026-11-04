export const DECKS = {
  points: ["0", "0.5", "1", "2", "3", "5", "8", "13", "20", "40", "100"],
  time: ["0.5", "1", "2", "3", "5", "8", "12", "16", "24", "40"],
} as const;

export type DeckType = keyof typeof DECKS;

export const DECK_TYPES = Object.keys(DECKS) as [DeckType, ...DeckType[]];

export function cardToNumber(card: string): number {
  return Number(card);
}
