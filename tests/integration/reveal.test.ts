import { generateId } from "@shared/ids.ts";
import type { RoomState, ServerMessage } from "@shared/protocol.ts";
import { describe, expect, it } from "vitest";
import { connect, createRoom, type TestSocket } from "./helpers.ts";

async function join(
  roomId: string,
  opts: { facilitatorToken?: string; name?: string } = {},
) {
  const socket = await connect(roomId);
  socket.send({
    type: "join",
    sessionId: generateId(),
    displayName: opts.name ?? "Ana",
    avatarId: null,
    ...(opts.facilitatorToken
      ? { facilitatorToken: opts.facilitatorToken }
      : {}),
  });
  const state = (await socket.nextMessage()) as RoomState;
  return { socket, state };
}

async function next(
  socket: TestSocket,
  predicate: (m: ServerMessage) => boolean,
): Promise<ServerMessage> {
  for (;;) {
    const m = await socket.nextMessage();
    if (predicate(m)) return m;
  }
}

const isError = (m: ServerMessage) => m.type === "error";
const isRevealed = (m: ServerMessage) =>
  m.type === "room_state" && m.round.status === "revealed";

describe("reveal", () => {
  it("recusa não facilitador com forbidden", async () => {
    const { roomId } = await createRoom();
    const ana = await join(roomId);
    ana.socket.send({ type: "reveal" });
    expect(await next(ana.socket, isError)).toMatchObject({
      code: "forbidden",
    });
  });

  it("recusa com reveal_blocked sem votantes ou com voto faltando", async () => {
    const { roomId, facilitatorToken } = await createRoom();
    const fac = await join(roomId, { facilitatorToken });
    fac.socket.send({ type: "reveal" });
    expect(await next(fac.socket, isError)).toMatchObject({
      code: "reveal_blocked",
    });

    await join(roomId);
    fac.socket.send({ type: "reveal" });
    expect(await next(fac.socket, isError)).toMatchObject({
      code: "reveal_blocked",
    });
  });

  it("revela a todas as conexões no mesmo broadcast e bloqueia votos e nova revelação", async () => {
    const { roomId, facilitatorToken } = await createRoom();
    const fac = await join(roomId, { facilitatorToken });
    const ana = await join(roomId);
    const caio = await join(roomId, { name: "Caio" });
    const anaId = ana.state.you.participantId;

    ana.socket.send({ type: "vote", card: "5" });
    caio.socket.send({ type: "vote", card: "8" });
    await next(fac.socket, (m) => m.type === "room_state" && m.round.canReveal);

    fac.socket.send({ type: "reveal" });
    for (const s of [fac, ana, caio]) {
      const state = (await next(s.socket, isRevealed)) as RoomState;
      expect(state.round.votes).toHaveLength(2);
      expect(state.round.votes).toContainEqual({
        participantId: anaId,
        card: "5",
      });
      expect(state.round.canReveal).toBe(false);
    }

    ana.socket.send({ type: "vote", card: "13" });
    expect(await next(ana.socket, isError)).toMatchObject({
      code: "round_not_voting",
    });
    fac.socket.send({ type: "reveal" });
    expect(await next(fac.socket, isError)).toMatchObject({
      code: "round_not_voting",
    });
  });

  it("antes da revelação nenhuma carta alheia é enviada", async () => {
    const { roomId, facilitatorToken } = await createRoom();
    const fac = await join(roomId, { facilitatorToken });
    const ana = await join(roomId);
    ana.socket.send({ type: "vote", card: "5" });
    const state = (await next(
      fac.socket,
      (m) => m.type === "room_state" && m.round.canReveal,
    )) as RoomState;
    expect(state.round.status).toBe("voting");
    expect(state.round.votes).toBeNull();
  });

  it("voto de votante desconectado entra na revelação", async () => {
    const { roomId, facilitatorToken } = await createRoom();
    const fac = await join(roomId, { facilitatorToken });
    const ana = await join(roomId);
    const caio = await join(roomId, { name: "Caio" });
    ana.socket.send({ type: "vote", card: "3" });
    caio.socket.send({ type: "vote", card: "5" });
    await next(fac.socket, (m) => m.type === "room_state" && m.round.canReveal);

    ana.socket.ws.close(1000);
    await next(
      fac.socket,
      (m) =>
        m.type === "room_state" && m.participants.some((p) => !p.connected),
    );
    fac.socket.send({ type: "reveal" });
    const state = (await next(fac.socket, isRevealed)) as RoomState;
    expect(state.round.votes).toHaveLength(2);
  });
});
