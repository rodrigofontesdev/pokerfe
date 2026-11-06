import { canReveal, missingVotes, reveal } from "@domain/reveal.ts";
import { describe, expect, it } from "vitest";

const p = (
  sessionId: string,
  o: Partial<{
    isFacilitator: boolean;
    isObserver: boolean;
    connected: boolean;
  }> = {},
) => ({
  sessionId,
  isFacilitator: false,
  isObserver: false,
  connected: true,
  ...o,
});

const fac = p("fac", { isFacilitator: true });

describe("canReveal / missingVotes", () => {
  it("é falso sem votante conectado", () => {
    expect(canReveal({ participants: [fac], votedSessionIds: new Set() })).toBe(
      false,
    );
  });

  it("é falso quando todos os não facilitadores são observadores", () => {
    const participants = [fac, p("a", { isObserver: true })];
    expect(canReveal({ participants, votedSessionIds: new Set() })).toBe(false);
  });

  it("é falso com voto faltando e conta quantos faltam", () => {
    const participants = [fac, p("a"), p("b"), p("c")];
    const votedSessionIds = new Set(["a"]);
    expect(canReveal({ participants, votedSessionIds })).toBe(false);
    expect(missingVotes({ participants, votedSessionIds })).toBe(2);
  });

  it("é verdadeiro com todos os votantes conectados votando e observador presente", () => {
    const participants = [
      fac,
      p("a"),
      p("b"),
      p("carlos", { isObserver: true }),
    ];
    const votedSessionIds = new Set(["a", "b"]);
    expect(canReveal({ participants, votedSessionIds })).toBe(true);
    expect(missingVotes({ participants, votedSessionIds })).toBe(0);
  });

  it("votante desconectado não é esperado e seu voto não atrapalha", () => {
    const participants = [fac, p("a"), p("b", { connected: false })];
    expect(
      canReveal({ participants, votedSessionIds: new Set(["a", "b"]) }),
    ).toBe(true);
    expect(
      missingVotes({ participants, votedSessionIds: new Set(["a"]) }),
    ).toBe(0);
  });

  it("não libera se o único votante conectado ainda não votou, mesmo com voto de desconectado", () => {
    const participants = [fac, p("a"), p("b", { connected: false })];
    expect(canReveal({ participants, votedSessionIds: new Set(["b"]) })).toBe(
      false,
    );
  });
});

describe("reveal", () => {
  const participants = [fac, p("a")];
  const base = {
    actor: { isFacilitator: true },
    roundStatus: "voting" as const,
    participants,
    votedSessionIds: new Set(["a"]),
  };

  it("transita voting → revealed", () => {
    expect(reveal(base)).toEqual({ ok: true });
  });

  it("recusa quem não é facilitador com forbidden", () => {
    expect(reveal({ ...base, actor: { isFacilitator: false } })).toEqual({
      ok: false,
      code: "forbidden",
    });
  });

  it("recusa rodada fora de voting com round_not_voting", () => {
    expect(reveal({ ...base, roundStatus: "revealed" })).toEqual({
      ok: false,
      code: "round_not_voting",
    });
  });

  it("recusa com voto faltando com reveal_blocked", () => {
    expect(reveal({ ...base, votedSessionIds: new Set() })).toEqual({
      ok: false,
      code: "reveal_blocked",
    });
  });
});
