import { generateId } from "@shared/ids.ts";
import type { RoomState } from "@shared/protocol.ts";
import { describe, expect, it } from "vitest";
import { connect, createRoom, type TestSocket } from "./helpers.ts";

async function join(
  roomId: string,
  opts: {
    sessionId?: string;
    displayName?: string;
    facilitatorToken?: string;
  } = {},
) {
  const socket = await connect(roomId);
  const sessionId = opts.sessionId ?? generateId();
  socket.send({
    type: "join",
    sessionId,
    displayName: opts.displayName ?? "Ana",
    avatarId: null,
    ...(opts.facilitatorToken
      ? { facilitatorToken: opts.facilitatorToken }
      : {}),
  });
  const state = (await socket.nextMessage()) as RoomState;
  return { socket, state, sessionId };
}

/** Consome mensagens até que `predicate` aceite um room_state. */
async function until(
  socket: TestSocket,
  predicate: (s: RoomState) => boolean,
): Promise<RoomState> {
  for (;;) {
    const m = (await socket.nextMessage()) as RoomState;
    if (m.type === "room_state" && predicate(m)) return m;
  }
}

describe("presença", () => {
  it("connected vira false quando a última conexão fecha e true ao voltar", async () => {
    const { roomId, facilitatorToken } = await createRoom();
    const fac = await join(roomId, { facilitatorToken, displayName: "Fac" });
    const ana = await join(roomId, { displayName: "Ana" });
    const anaId = ana.state.you.participantId;
    await until(fac.socket, (s) => s.participants.length === 2);

    ana.socket.ws.close(1000);
    const off = await until(
      fac.socket,
      (s) =>
        s.participants.find((p) => p.participantId === anaId)?.connected ===
        false,
    );
    expect(off.participants).toHaveLength(2);

    const back = await join(roomId, { sessionId: ana.sessionId });
    expect(back.state.you.participantId).toBe(anaId);
    const on = await until(
      fac.socket,
      (s) =>
        s.participants.find((p) => p.participantId === anaId)?.connected ===
        true,
    );
    expect(on.participants).toHaveLength(2);
  });

  it("várias conexões do mesmo sessionId: só desconecta na última", async () => {
    const { roomId, facilitatorToken } = await createRoom();
    const fac = await join(roomId, { facilitatorToken });
    const a1 = await join(roomId, { displayName: "Ana" });
    const a2 = await join(roomId, { sessionId: a1.sessionId });
    const anaId = a1.state.you.participantId;
    await until(fac.socket, (s) => s.participants.length === 2);

    a1.socket.ws.close(1000);
    // Força um novo broadcast: se connected tivesse virado false, apareceria aqui.
    const third = await join(roomId, { displayName: "Caio" });
    const seen = await until(fac.socket, (s) => s.participants.length === 3);
    expect(
      seen.participants.find((p) => p.participantId === anaId)?.connected,
    ).toBe(true);

    a2.socket.ws.close(1000);
    third.socket.ws.close(1000);
    const off = await until(
      fac.socket,
      (s) =>
        s.participants.find((p) => p.participantId === anaId)?.connected ===
        false,
    );
    expect(
      off.participants.find((p) => p.participantId === anaId)?.connected,
    ).toBe(false);
  });

  it("papéis e participantId corretos para todas as conexões", async () => {
    const { roomId, facilitatorToken } = await createRoom();
    const fac = await join(roomId, { facilitatorToken, displayName: "Fac" });
    const ana = await join(roomId, { displayName: "Ana" });
    const facState = await until(
      fac.socket,
      (s) => s.participants.length === 2,
    );

    expect(facState.you.isFacilitator).toBe(true);
    expect(ana.state.you.isFacilitator).toBe(false);
    expect(ana.state.you.participantId).not.toBe(facState.you.participantId);

    const byId = new Map(
      facState.participants.map((p) => [p.participantId, p]),
    );
    expect(byId.get(facState.you.participantId)).toMatchObject({
      isFacilitator: true,
      isObserver: false,
    });
    expect(byId.get(ana.state.you.participantId)).toMatchObject({
      isFacilitator: false,
      isObserver: false,
      hasVoted: false,
    });
    expect(JSON.stringify(facState)).not.toContain(ana.sessionId);
  });
});
