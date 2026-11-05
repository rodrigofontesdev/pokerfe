import { createInitialRoomState } from "@domain/room.ts";
import { describe, expect, it } from "vitest";

describe("createInitialRoomState", () => {
  it("cria a sala com a rodada 1 em votação", () => {
    const { room, round } = createInitialRoomState({
      name: "Sprint",
      deckType: "points",
      facilitatorTokenHash: "abc",
      now: 1000,
    });
    expect(room).toEqual({
      name: "Sprint",
      deckType: "points",
      createdAt: 1000,
      lastActivityAt: 1000,
      facilitatorTokenHash: "abc",
      currentRound: 1,
    });
    expect(round.number).toBe(1);
    expect(round.status).toBe("voting");
    expect(round.title).toBeNull();
  });
});
