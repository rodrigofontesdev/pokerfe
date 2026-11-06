import { DECKS } from "@shared/decks.ts";
import { castVote } from "@domain/voting.ts";
import { describe, expect, it } from "vitest";

const voter = { isFacilitator: false, isObserver: false };
const base = {
  participant: voter,
  roundStatus: "voting" as const,
  deck: DECKS.points,
  card: "5",
};

describe("castVote", () => {
  it("aceita voto de votante em voting com carta do baralho", () => {
    expect(castVote(base)).toEqual({ ok: true, card: "5" });
  });

  it("troca: um novo voto válido é aceito e carrega a nova carta", () => {
    expect(castVote({ ...base, card: "8" })).toEqual({ ok: true, card: "8" });
  });

  it("recusa carta fora do baralho da sala", () => {
    expect(castVote({ ...base, card: "12" })).toEqual({
      ok: false,
      code: "invalid_card",
    });
    expect(castVote({ ...base, deck: DECKS.time, card: "0" })).toEqual({
      ok: false,
      code: "invalid_card",
    });
    expect(castVote({ ...base, card: "5h" })).toMatchObject({ ok: false });
  });

  it("recusa fora de voting", () => {
    expect(castVote({ ...base, roundStatus: "revealed" })).toEqual({
      ok: false,
      code: "round_not_voting",
    });
  });

  it("recusa facilitador e observador", () => {
    for (const participant of [
      { isFacilitator: true, isObserver: false },
      { isFacilitator: false, isObserver: true },
    ]) {
      expect(castVote({ ...base, participant })).toEqual({
        ok: false,
        code: "forbidden",
      });
    }
  });
});
