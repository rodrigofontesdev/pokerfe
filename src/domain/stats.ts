import { cardToNumber } from "@shared/decks.ts";

export interface RoundResult {
  median: number | null;
  modes: number[];
  distribution: { card: string; count: number }[];
}

export function computeResult(
  cards: readonly string[],
  deck: readonly string[],
): RoundResult {
  const values = cards.map(cardToNumber).sort((a, b) => a - b);

  let median: number | null = null;
  if (values.length > 0) {
    const mid = Math.floor(values.length / 2);
    median =
      values.length % 2 === 1
        ? values[mid]!
        : (values[mid - 1]! + values[mid]!) / 2;
  }

  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const max = Math.max(0, ...counts.values());
  const modes =
    max > 1 ? [...counts].filter(([, c]) => c === max).map(([v]) => v) : [];

  const distribution = deck
    .map((card) => ({ card, count: cards.filter((c) => c === card).length }))
    .filter((d) => d.count > 0);

  return { median, modes, distribution };
}
