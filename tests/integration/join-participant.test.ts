import { generateId } from "@shared/ids.ts";
import type { RoomState, ServerMessage } from "@shared/protocol.ts";
import { describe, expect, it } from "vitest";
import { connect, createRoom } from "./helpers.ts";

async function join(
  roomId: string,
  profile: { displayName: string; avatarId: string | null },
  sessionId = generateId(),
) {
  const socket = await connect(roomId);
  socket.send({ type: "join", sessionId, ...profile });
  const message: ServerMessage = await socket.nextMessage();
  return { socket, message, sessionId };
}

describe("join de participante", () => {
  it("participante novo entra como votante e aparece para todas as conexões", async () => {
    const { roomId, facilitatorToken } = await createRoom();
    const facilitator = await connect(roomId);
    facilitator.send({
      type: "join",
      sessionId: generateId(),
      displayName: "Fátima",
      avatarId: null,
      facilitatorToken,
    });
    await facilitator.nextMessage();

    const ana = await join(roomId, { displayName: "Ana", avatarId: "fox" });
    const state = ana.message as RoomState;
    expect(state.type).toBe("room_state");
    expect(state.you.isFacilitator).toBe(false);
    expect(state.you.isObserver).toBe(false);
    const entry = state.participants.find(
      (p) => p.participantId === state.you.participantId,
    );
    expect(entry).toMatchObject({
      displayName: "Ana",
      avatarId: "fox",
      isFacilitator: false,
      isObserver: false,
      connected: true,
    });

    const broadcast = (await facilitator.nextMessage()) as RoomState;
    expect(broadcast.participants.map((p) => p.displayName).sort()).toEqual([
      "Ana",
      "Fátima",
    ]);
  });

  it("join repetido com o mesmo sessionId mantém participantId e atualiza nome e avatar", async () => {
    const { roomId } = await createRoom();
    const first = await join(roomId, { displayName: "Ana", avatarId: null });
    const second = await join(
      roomId,
      { displayName: "Ana Maria", avatarId: "tiger" },
      first.sessionId,
    );
    const a = first.message as RoomState;
    const b = second.message as RoomState;
    expect(b.you.participantId).toBe(a.you.participantId);
    expect(b.participants).toHaveLength(1);
    expect(b.participants[0]).toMatchObject({
      displayName: "Ana Maria",
      avatarId: "tiger",
    });
  });

  it("displayName com 46 caracteres recebe validation_error", async () => {
    const { roomId } = await createRoom();
    const { message } = await join(roomId, {
      displayName: "a".repeat(46),
      avatarId: null,
    });
    expect(message).toMatchObject({
      type: "error",
      code: "validation_error",
    });
  });

  it("displayName com 45 caracteres é aceito", async () => {
    const { roomId } = await createRoom();
    const { message } = await join(roomId, {
      displayName: "a".repeat(45),
      avatarId: null,
    });
    expect(message.type).toBe("room_state");
  });

  it("sessionId nunca aparece no room_state de outra conexão", async () => {
    const { roomId } = await createRoom();
    const first = await join(roomId, { displayName: "Ana", avatarId: null });
    const second = await join(roomId, { displayName: "Bia", avatarId: null });
    const broadcast = await first.socket.nextMessage();
    for (const m of [first.message, second.message, broadcast]) {
      const text = JSON.stringify(m);
      expect(text).not.toContain(first.sessionId);
      expect(text).not.toContain(second.sessionId);
    }
  });
});
