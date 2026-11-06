import { setObserver } from "@domain/observers.ts";
import { describe, expect, it } from "vitest";

const facilitator = { participantId: "fac", isFacilitator: true };
const base = {
  actor: facilitator,
  target: { participantId: "carlos" },
  observer: true,
  roundStatus: "voting" as const,
};

describe("setObserver", () => {
  it("facilitador marca outro participante como observador e descarta o voto em voting", () => {
    expect(setObserver(base)).toEqual({
      ok: true,
      observer: true,
      discardVote: true,
    });
  });

  it("observador volta a votante sem descartar voto", () => {
    expect(setObserver({ ...base, observer: false })).toEqual({
      ok: true,
      observer: false,
      discardVote: false,
    });
  });

  it("não descarta votos de rodada já revelada", () => {
    expect(setObserver({ ...base, roundStatus: "revealed" })).toMatchObject({
      ok: true,
      discardVote: false,
    });
  });

  it("recusa quem não é facilitador com forbidden", () => {
    expect(
      setObserver({
        ...base,
        actor: { participantId: "ana", isFacilitator: false },
      }),
    ).toEqual({ ok: false, code: "forbidden" });
  });

  it("não pode marcar a si mesmo", () => {
    expect(setObserver({ ...base, target: { participantId: "fac" } })).toEqual({
      ok: false,
      code: "invalid_target",
    });
  });

  it("alvo inexistente é invalid_target", () => {
    expect(setObserver({ ...base, target: null })).toEqual({
      ok: false,
      code: "invalid_target",
    });
  });
});
