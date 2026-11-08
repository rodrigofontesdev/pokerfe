import { generateId } from "@shared/ids.ts";
import type { RoomState } from "@shared/protocol.ts";
import { describe, expect, it } from "vitest";
import { connect, createRoom, type TestSocket } from "./helpers.ts";

async function join(
  roomId: string,
  opts: { sessionId?: string; displayName?: string; facilitatorToken?: string },
) {
  const socket = await connect(roomId);
  const sessionId = opts.sessionId ?? generateId();
  socket.send({
    type: "join",
    sessionId,
    displayName: opts.displayName ?? "Ana",
    avatarId: "fox",
    ...(opts.facilitatorToken
      ? { facilitatorToken: opts.facilitatorToken }
      : {}),
  });
  const state = (await socket.nextMessage()) as RoomState;
  return { socket, state, sessionId };
}

async function until(
  socket: TestSocket,
  predicate: (s: RoomState) => boolean,
): Promise<RoomState> {
  for (;;) {
    const m = (await socket.nextMessage()) as RoomState;
    if (m.type === "room_state" && predicate(m)) return m;
  }
}

describe("reconexão (FR-022)", () => {
  it("novo join com o mesmo sessionId recupera papel e voto em votação", async () => {
    const { roomId, facilitatorToken } = await createRoom();
    const fac = await join(roomId, { facilitatorToken, displayName: "Fac" });
    const ana = await join(roomId, { displayName: "Ana" });
    const anaId = ana.state.you.participantId;
    ana.socket.send({ type: "vote", card: "5" });
    await until(ana.socket, (s) => s.you.myVote === "5");

    ana.socket.ws.close(1000);
    await until(
      fac.socket,
      (s) =>
        s.participants.find((p) => p.participantId === anaId)?.connected ===
        false,
    );

    const back = await join(roomId, { sessionId: ana.sessionId });
    expect(back.state.you).toMatchObject({
      participantId: anaId,
      isFacilitator: false,
      isObserver: false,
      myVote: "5",
    });
    expect(back.state.round.status).toBe("voting");
    expect(
      back.state.participants.find((p) => p.participantId === anaId),
    ).toMatchObject({ displayName: "Ana", hasVoted: true, connected: true });

    back.socket.send({ type: "vote", card: "8" });
    const changed = await until(back.socket, (s) => s.you.myVote === "8");
    expect(changed.round.status).toBe("voting");
  });

  it("revelação durante a queda: ao voltar recebe a rodada revelada com o voto", async () => {
    const { roomId, facilitatorToken } = await createRoom();
    const fac = await join(roomId, { facilitatorToken, displayName: "Fac" });
    const ana = await join(roomId, { displayName: "Ana" });
    const anaId = ana.state.you.participantId;
    ana.socket.send({ type: "vote", card: "5" });
    await until(ana.socket, (s) => s.you.myVote === "5");
    // Reveal exige ao menos um votante conectado (FR-012).
    const bia = await join(roomId, { displayName: "Bia" });
    bia.socket.send({ type: "vote", card: "3" });
    await until(bia.socket, (s) => s.you.myVote === "3");
    ana.socket.ws.close(1000);
    await until(
      fac.socket,
      (s) =>
        s.participants.find((p) => p.participantId === anaId)?.connected ===
          false && s.round.canReveal,
    );

    fac.socket.send({ type: "reveal" });
    await until(fac.socket, (s) => s.round.status === "revealed");

    const back = await join(roomId, { sessionId: ana.sessionId });
    expect(back.state.round.status).toBe("revealed");
    expect(back.state.round.votes).toContainEqual({
      participantId: anaId,
      card: "5",
    });
    expect(back.state.round.result?.median).toBe(4);
    expect(back.state.you.participantId).toBe(anaId);

    fac.socket.send({ type: "new_round" });
    const next = await until(back.socket, (s) => s.round.number === 2);
    expect(next.round.status).toBe("voting");
    expect(next.you.myVote).toBeNull();
  });
});
