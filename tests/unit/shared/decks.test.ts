import { describe, expect, it } from "vitest";
import { cardToNumber, DECKS } from "@shared/decks.ts";

describe("decks", () => {
  it("points tem os valores exatos", () => {
    expect([...DECKS.points]).toEqual([
      "0",
      "0.5",
      "1",
      "2",
      "3",
      "5",
      "8",
      "13",
      "20",
      "40",
      "100",
    ]);
  });

  it("time tem os valores exatos", () => {
    expect([...DECKS.time]).toEqual([
      "0.5h",
      "1h",
      "2h",
      "3h",
      "5h",
      "8h",
      "12h",
      "16h",
      "24h",
      "40h",
    ]);
  });

  it("converte rótulo em número", () => {
    expect(cardToNumber("0.5")).toBe(0.5);
    expect(cardToNumber("100")).toBe(100);
    expect(cardToNumber("0.5h")).toBe(0.5);
    expect(cardToNumber("40h")).toBe(40);
  });
});
