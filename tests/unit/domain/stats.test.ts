import { computeResult } from "@domain/stats.ts";
import { DECKS } from "@shared/decks.ts";
import { describe, expect, it } from "vitest";

const points = DECKS.points;

describe("computeResult", () => {
  it("calcula mediana 5 e moda [5] para os votos 3, 5, 5 e 8 (quantidade par, uma moda)", () => {
    const r = computeResult(["3", "5", "5", "8"], points);
    expect(r.median).toBe(5);
    expect(r.modes).toEqual([5]);
  });

  it("calcula mediana 5,5 e modas [3, 8] para os votos 3, 3, 8 e 8 (empate de moda)", () => {
    const r = computeResult(["8", "3", "8", "3"], points);
    expect(r.median).toBe(5.5);
    expect(r.modes).toEqual([3, 8]);
  });

  it("calcula mediana 3 e nenhuma moda para os votos 2, 3 e 5 (nenhum valor se repete)", () => {
    const r = computeResult(["2", "3", "5"], points);
    expect(r.median).toBe(3);
    expect(r.modes).toEqual([]);
  });

  it("converte a carta 0.5 do baralho de tempo no valor numérico 0,5 ao calcular mediana e moda", () => {
    const r = computeResult(["0.5", "0.5", "1"], DECKS.time);
    expect(r.median).toBe(0.5);
    expect(r.modes).toEqual([0.5]);
  });

  it("retorna a distribuição apenas com as cartas que receberam voto, na ordem do baralho", () => {
    const r = computeResult(["8", "3", "5", "5"], points);
    expect(r.distribution).toEqual([
      { card: "3", count: 1 },
      { card: "5", count: 2 },
      { card: "8", count: 1 },
    ]);
  });

  it("retorna mediana nula, sem modas e distribuição vazia quando não há votos", () => {
    expect(computeResult([], points)).toEqual({
      median: null,
      modes: [],
      distribution: [],
    });
  });
});
