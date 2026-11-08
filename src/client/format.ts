import type { DeckType } from "@shared/decks.ts";

export function formatNumber(value: number, deckType: DeckType): string {
  const text = value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return deckType === "time" ? `${text}h` : text;
}

export function formatModes(modes: readonly number[], deckType: DeckType) {
  if (modes.length === 0) return "Sem moda";
  return modes.map((m) => formatNumber(m, deckType)).join(", ");
}

export function roundHeading(round: { number: number; title: string | null }): string {
  return round.title ?? `Rodada ${round.number}`;
}
