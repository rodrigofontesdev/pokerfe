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
      "0.5",
      "1",
      "2",
      "3",
      "5",
      "8",
      "12",
      "16",
      "24",
      "40",
    ]);
  });

  it("converte rótulo em número", () => {
    expect(cardToNumber("0.5")).toBe(0.5);
    expect(cardToNumber("100")).toBe(100);
    expect(cardToNumber("12")).toBe(12);
  });
});
