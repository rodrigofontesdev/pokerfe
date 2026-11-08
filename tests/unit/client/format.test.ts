import { formatModes, formatNumber, roundHeading } from "@client/format.ts";
import { describe, expect, it } from "vitest";

describe("format", () => {
  it("mediana 5.5 vira 5,5", () => {
    expect(formatNumber(5.5, "points")).toBe("5,5");
  });

  it("baralho de tempo leva o sufixo h", () => {
    expect(formatNumber(5, "time")).toBe("5h");
    expect(formatNumber(0.5, "time")).toBe("0,5h");
  });

  it("[] vira Sem moda", () => {
    expect(formatModes([], "points")).toBe("Sem moda");
  });

  it("várias modas separadas por vírgula", () => {
    expect(formatModes([3, 8], "points")).toBe("3, 8");
  });

  it("rodada sem título é exibida como Rodada N", () => {
    expect(roundHeading({ number: 3, title: null })).toBe("Rodada 3");
  });

  it("título da rodada substitui o fallback", () => {
    expect(roundHeading({ number: 3, title: "Login com Google" })).toBe(
      "Login com Google",
    );
  });
});
