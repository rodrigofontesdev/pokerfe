export const DECKS = {
  points: ["0", "0.5", "1", "2", "3", "5", "8", "13", "20", "40", "100"],
  time: ["0.5h", "1h", "2h", "3h", "5h", "8h", "12h", "16h", "24h", "40h"],
} as const;

export type DeckType = keyof typeof DECKS;

export const DECK_TYPES = Object.keys(DECKS) as [DeckType, ...DeckType[]];

export function cardToNumber(card: string): number {
  return Number(card.endsWith("h") ? card.slice(0, -1) : card);
}
