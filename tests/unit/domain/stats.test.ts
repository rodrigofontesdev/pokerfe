import { computeResult } from "@domain/stats.ts";
import { DECKS } from "@shared/decks.ts";
import { describe, expect, it } from "vitest";

const points = DECKS.points;

describe("computeResult", () => {
  it("3, 5, 5, 8 → mediana 5, modas [5]", () => {
    const r = computeResult(["3", "5", "5", "8"], points);
    expect(r.median).toBe(5);
    expect(r.modes).toEqual([5]);
  });

  it("3, 3, 8, 8 → mediana 5,5, modas [3, 8]", () => {
    const r = computeResult(["8", "3", "8", "3"], points);
    expect(r.median).toBe(5.5);
    expect(r.modes).toEqual([3, 8]);
  });

  it("2, 3, 5 → mediana 3, sem moda", () => {
    const r = computeResult(["2", "3", "5"], points);
    expect(r.median).toBe(3);
    expect(r.modes).toEqual([]);
  });

  it("baralho de tempo converte 0.5 em 0,5", () => {
    const r = computeResult(["0.5", "0.5", "1"], DECKS.time);
    expect(r.median).toBe(0.5);
    expect(r.modes).toEqual([0.5]);
  });

  it("distribuição só com cartas votadas, na ordem do baralho", () => {
    const r = computeResult(["8", "3", "5", "5"], points);
    expect(r.distribution).toEqual([
      { card: "3", count: 1 },
      { card: "5", count: 2 },
      { card: "8", count: 1 },
    ]);
  });

  it("sem votos: mediana nula", () => {
    expect(computeResult([], points)).toEqual({
      median: null,
      modes: [],
      distribution: [],
    });
  });
});
