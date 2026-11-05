import { registerParticipant } from "@domain/participants.ts";
import { describe, expect, it } from "vitest";

const base = {
  sessionId: "s",
  displayName: "Ana",
  avatarId: null,
  newParticipantId: "p1",
  now: 10,
};

describe("registerParticipant", () => {
  it("cria votante para sessionId novo sem token válido", () => {
    const p = registerParticipant({
      ...base,
      existing: null,
      hasValidFacilitatorToken: false,
    });
    expect(p.isFacilitator).toBe(false);
    expect(p.isObserver).toBe(false);
    expect(p.participantId).toBe("p1");
  });

  it("cria facilitador com token válido", () => {
    const p = registerParticipant({
      ...base,
      existing: null,
      hasValidFacilitatorToken: true,
    });
    expect(p.isFacilitator).toBe(true);
    expect(p.isObserver).toBe(false);
  });

  it("recupera papel e id e atualiza nome e avatar", () => {
    const first = registerParticipant({
      ...base,
      existing: null,
      hasValidFacilitatorToken: true,
    });
    const again = registerParticipant({
      ...base,
      existing: first,
      displayName: "Bia",
      avatarId: "fox",
      hasValidFacilitatorToken: false,
      newParticipantId: "p2",
      now: 20,
    });
    expect(again.participantId).toBe("p1");
    expect(again.isFacilitator).toBe(true);
    expect(again.displayName).toBe("Bia");
    expect(again.avatarId).toBe("fox");
    expect(again.lastSeenAt).toBe(20);
  });
});
