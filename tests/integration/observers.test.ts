import { env, runInDurableObject } from "cloudflare:test";
import { generateId } from "@shared/ids.ts";
import type { RoomState, ServerMessage } from "@shared/protocol.ts";
import type { Room } from "@room/Room.ts";
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

describe("set_observer", () => {
  it("recusa não facilitador com forbidden", async () => {
    const { roomId } = await createRoom();
    const ana = await join(roomId);
    const caio = await join(roomId, { name: "Caio" });
    ana.socket.send({
      type: "set_observer",
      participantId: caio.state.you.participantId,
      observer: true,
    });
    expect(await next(ana.socket, isError)).toMatchObject({
      code: "forbidden",
    });
  });

  it("recusa participante inexistente e o próprio facilitador com invalid_target", async () => {
    const { roomId, facilitatorToken } = await createRoom();
    const fac = await join(roomId, { facilitatorToken });
    fac.socket.send({
      type: "set_observer",
      participantId: generateId(),
      observer: true,
    });
    expect(await next(fac.socket, isError)).toMatchObject({
      code: "invalid_target",
    });
    fac.socket.send({
      type: "set_observer",
      participantId: fac.state.you.participantId,
      observer: true,
    });
    expect(await next(fac.socket, isError)).toMatchObject({
      code: "invalid_target",
    });
  });

  it("alterna o papel, apaga o voto e transmite a todos", async () => {
    const { roomId, facilitatorToken } = await createRoom();
    const fac = await join(roomId, { facilitatorToken });
    const ana = await join(roomId);
    const anaId = ana.state.you.participantId;

    ana.socket.send({ type: "vote", card: "5" });
    await next(
      ana.socket,
      (m) => m.type === "room_state" && m.you.myVote === "5",
    );

    fac.socket.send({
      type: "set_observer",
      participantId: anaId,
      observer: true,
    });
    const own = (await next(
      ana.socket,
      (m) => m.type === "room_state" && m.you.isObserver,
    )) as RoomState;
    expect(own.you.myVote).toBeNull();
    const seen = (await next(
      fac.socket,
      (m) =>
        m.type === "room_state" &&
        m.participants.find((p) => p.participantId === anaId)!.isObserver,
    )) as RoomState;
    expect(
      seen.participants.find((p) => p.participantId === anaId),
    ).toMatchObject({ isObserver: true, hasVoted: false });

    await runInDurableObject(
      env.ROOM.get(env.ROOM.idFromName(roomId)),
      (_i: Room, state) => {
        expect(state.storage.sql.exec("SELECT * FROM votes").toArray()).toEqual(
          [],
        );
      },
    );

    fac.socket.send({
      type: "set_observer",
      participantId: anaId,
      observer: false,
    });
    const back = (await next(
      ana.socket,
      (m) => m.type === "room_state" && !m.you.isObserver,
    )) as RoomState;
    expect(back.you.isObserver).toBe(false);
  });
});
