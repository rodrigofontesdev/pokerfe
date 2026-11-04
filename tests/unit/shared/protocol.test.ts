import { describe, expect, it } from "vitest";
import { generateId } from "@shared/ids.ts";
import {
  clientMessageSchema,
  createRoomRequestSchema,
  createRoomResponseSchema,
  joinMessageSchema,
  roomStateMessageSchema,
  serverMessageSchema,
  setTitleMessageSchema,
} from "@shared/protocol.ts";

const join = (displayName: string) => ({
  type: "join",
  sessionId: generateId(),
  displayName,
  avatarId: null,
});

describe("createRoomRequestSchema", () => {
  it("aceita 250 e rejeita 251 caracteres", () => {
    const ok = createRoomRequestSchema.safeParse({
      name: "a".repeat(250),
      deckType: "points",
    });
    expect(ok.success).toBe(true);
    expect(
      createRoomRequestSchema.safeParse({
        name: "a".repeat(251),
        deckType: "points",
      }).success,
    ).toBe(false);
  });

  it("aplica trim e rejeita nome vazio após trim", () => {
    const r = createRoomRequestSchema.parse({
      name: `  ${"a".repeat(250)}  `,
      deckType: "time",
    });
    expect(r.name).toHaveLength(250);
    expect(
      createRoomRequestSchema.safeParse({ name: "   ", deckType: "time" })
        .success,
    ).toBe(false);
  });

  it("rejeita baralho desconhecido", () => {
    expect(
      createRoomRequestSchema.safeParse({ name: "x", deckType: "fib" }).success,
    ).toBe(false);
  });
});

describe("join", () => {
  it("aceita 45 e rejeita 46 caracteres", () => {
    expect(joinMessageSchema.safeParse(join("a".repeat(45))).success).toBe(
      true,
    );
    expect(joinMessageSchema.safeParse(join("a".repeat(46))).success).toBe(
      false,
    );
  });

  it("rejeita nome vazio após trim e sessionId inválido", () => {
    expect(joinMessageSchema.safeParse(join("  ")).success).toBe(false);
    expect(
      joinMessageSchema.safeParse({ ...join("Ana"), sessionId: "curto" })
        .success,
    ).toBe(false);
  });
});

describe("set_title", () => {
  it("aceita 250, rejeita 251 e permite vazio", () => {
    const t = (title: string) =>
      setTitleMessageSchema.safeParse({ type: "set_title", title });
    expect(t("a".repeat(250)).success).toBe(true);
    expect(t("a".repeat(251)).success).toBe(false);
    expect(t("   ")).toMatchObject({ success: true, data: { title: "" } });
  });
});

describe("mensagens", () => {
  it("discrimina mensagens do cliente e rejeita type desconhecido", () => {
    for (const m of [
      { type: "vote", card: "5" },
      { type: "set_observer", participantId: generateId(), observer: true },
      { type: "reveal" },
      { type: "new_round" },
    ]) {
      expect(clientMessageSchema.safeParse(m).success).toBe(true);
    }
    expect(clientMessageSchema.safeParse({ type: "x" }).success).toBe(false);
  });

  it("valida a resposta de criação e o error do servidor", () => {
    expect(
      createRoomResponseSchema.safeParse({
        roomId: generateId(),
        facilitatorToken: generateId(),
      }).success,
    ).toBe(true);
    expect(
      serverMessageSchema.safeParse({
        type: "error",
        code: "reveal_blocked",
        message: "Ainda faltam votos",
      }).success,
    ).toBe(true);
  });

  it("valida o room_state do contrato", () => {
    const pid = generateId();
    const state = {
      type: "room_state",
      room: { name: "S", deckType: "points", deck: ["0", "1"] },
      you: {
        participantId: pid,
        isFacilitator: false,
        isObserver: false,
        myVote: "5",
      },
      participants: [
        {
          participantId: pid,
          displayName: "Ana",
          avatarId: "raposa",
          isFacilitator: false,
          isObserver: false,
          connected: true,
          hasVoted: true,
        },
      ],
      round: {
        number: 3,
        title: null,
        status: "voting",
        missingVotes: 2,
        canReveal: false,
        votes: null,
        result: null,
      },
      history: [{ number: 2, title: null, median: 5, modes: [5] }],
    };
    expect(roomStateMessageSchema.safeParse(state).success).toBe(true);
  });
});
