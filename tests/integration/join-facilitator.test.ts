import { generateId } from "@shared/ids.ts";
import type { RoomState } from "@shared/protocol.ts";
import { describe, expect, it } from "vitest";
import { connect, createRoom } from "./helpers.ts";

async function join(
  roomId: string,
  extra: {
    facilitatorToken?: string;
    sessionId?: string;
    displayName?: string;
  } = {},
) {
  const socket = await connect(roomId);
  const sessionId = extra.sessionId ?? generateId();
  socket.send({
    type: "join",
    sessionId,
    displayName: extra.displayName ?? "Ana",
    avatarId: null,
    ...(extra.facilitatorToken
      ? { facilitatorToken: extra.facilitatorToken }
      : {}),
  });
  const state = (await socket.nextMessage()) as RoomState;
  return { socket, state, sessionId };
}

describe("join", () => {
  it("token válido cria facilitador com participantId público", async () => {
    const { roomId, facilitatorToken } = await createRoom();
    const { state } = await join(roomId, { facilitatorToken });
    expect(state.type).toBe("room_state");
    expect(state.you.isFacilitator).toBe(true);
    expect(state.you.participantId).toMatch(/^[0-9A-Za-z]{22}$/);
    expect(state.participants[0]!.isFacilitator).toBe(true);
    expect(state.round.number).toBe(1);
    expect(state.round.status).toBe("voting");
  });

  it("token inválido entra sem papel e sem erro", async () => {
    const { roomId } = await createRoom();
    const { state } = await join(roomId, { facilitatorToken: generateId() });
    expect(state.type).toBe("room_state");
    expect(state.you.isFacilitator).toBe(false);
  });

  it("novo join com o mesmo sessionId mantém id e papel e atualiza o nome", async () => {
    const { roomId, facilitatorToken } = await createRoom();
    const first = await join(roomId, { facilitatorToken, displayName: "Ana" });
    const second = await join(roomId, {
      sessionId: first.sessionId,
      displayName: "Bia",
    });
    expect(second.state.you.participantId).toBe(first.state.you.participantId);
    expect(second.state.you.isFacilitator).toBe(true);
    const broadcast = (await first.socket.nextMessage()) as RoomState;
    expect(broadcast.participants).toHaveLength(1);
    expect(broadcast.participants[0]!.displayName).toBe("Bia");
    expect(JSON.stringify(broadcast)).not.toContain(first.sessionId);
  });
});
