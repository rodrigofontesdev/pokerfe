import { newRound, setTitle, sortHistory } from "@domain/rounds.ts";
import { describe, expect, it } from "vitest";

const fac = { isFacilitator: true };

describe("newRound", () => {
  it("só é permitido com a rodada revelada", () => {
    expect(
      newRound({ actor: fac, roundStatus: "voting", currentRound: 1 }),
    ).toEqual({ ok: false, code: "round_not_revealed" });
    expect(
      newRound({ actor: fac, roundStatus: "archived", currentRound: 1 }),
    ).toEqual({ ok: false, code: "round_not_revealed" });
  });

  it("recusa quem não é facilitador", () => {
    expect(
      newRound({
        actor: { isFacilitator: false },
        roundStatus: "revealed",
        currentRound: 1,
      }),
    ).toEqual({ ok: false, code: "forbidden" });
  });

  it("arquiva a rodada atual e abre a N+1", () => {
    expect(
      newRound({ actor: fac, roundStatus: "revealed", currentRound: 3 }),
    ).toEqual({ ok: true, archivedRound: 3, nextRound: 4 });
  });
});

describe("sortHistory", () => {
  it("ordena da rodada mais recente para a mais antiga", () => {
    const sorted = sortHistory([{ number: 1 }, { number: 3 }, { number: 2 }]);
    expect(sorted.map((r) => r.number)).toEqual([3, 2, 1]);
  });
});

describe("setTitle", () => {
  it("continua válido (regressão do módulo)", () => {
    expect(
      setTitle({ actor: fac, roundStatus: "voting", title: " a " }),
    ).toEqual({ ok: true, title: "a" });
  });
});
