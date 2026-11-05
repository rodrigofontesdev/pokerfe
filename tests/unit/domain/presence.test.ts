import { buildPresence, isConnected } from "@domain/presence.ts";
import type { Participant } from "@domain/types.ts";
import { describe, expect, it } from "vitest";

function participant(overrides: Partial<Participant>): Participant {
  return {
    sessionId: "s1",
    participantId: "p1",
    displayName: "Ana",
    avatarId: null,
    isFacilitator: false,
    isObserver: false,
    connected: true,
    lastSeenAt: 1,
    ...overrides,
  };
}

const people = [
  participant({ sessionId: "sf", participantId: "pf", isFacilitator: true }),
  participant({ sessionId: "s1", participantId: "p1", displayName: "Ana" }),
  participant({
    sessionId: "s2",
    participantId: "p2",
    displayName: "Bia",
    connected: false,
  }),
  participant({
    sessionId: "s3",
    participantId: "p3",
    displayName: "Caio",
    isObserver: true,
  }),
];

describe("buildPresence", () => {
  it("marca hasVoted sem expor valor nem sessionId", () => {
    const view = buildPresence({
      participants: people,
      votedSessionIds: new Set(["s1"]),
      sessionId: "s1",
    })!;
    expect(view.participants.map((p) => p.hasVoted)).toEqual([
      false,
      true,
      false,
      false,
    ]);
    const json = JSON.stringify(view);
    expect(json).not.toContain("sessionId");
    expect(json).not.toContain('"s1"');
    expect(json).not.toContain("card");
  });

  it("reflete papéis e connected", () => {
    const view = buildPresence({
      participants: people,
      votedSessionIds: new Set(),
      sessionId: "s1",
    })!;
    expect(view.participants[0]).toMatchObject({
      isFacilitator: true,
      isObserver: false,
    });
    expect(view.participants[2]!.connected).toBe(false);
    expect(view.participants[3]!.isObserver).toBe(true);
  });

  it("monta you do ponto de vista de cada conexão", () => {
    const facilitator = buildPresence({
      participants: people,
      votedSessionIds: new Set(),
      sessionId: "sf",
    })!;
    expect(facilitator.you).toEqual({
      participantId: "pf",
      isFacilitator: true,
      isObserver: false,
    });
    const observer = buildPresence({
      participants: people,
      votedSessionIds: new Set(),
      sessionId: "s3",
    })!;
    expect(observer.you.isObserver).toBe(true);
  });

  it("retorna null para sessionId desconhecido", () => {
    expect(
      buildPresence({
        participants: people,
        votedSessionIds: new Set(),
        sessionId: "x",
      }),
    ).toBeNull();
  });

  it("mantém todos os participantes, sem limite fixo (FR-024)", () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      participant({ sessionId: `s${i}`, participantId: `p${i}` }),
    );
    const view = buildPresence({
      participants: many,
      votedSessionIds: new Set(),
      sessionId: "s0",
    })!;
    expect(view.participants).toHaveLength(25);
  });
});

describe("isConnected", () => {
  it("é verdadeiro enquanto houver conexão aberta", () => {
    expect(isConnected(2)).toBe(true);
    expect(isConnected(1)).toBe(true);
    expect(isConnected(0)).toBe(false);
  });
});
