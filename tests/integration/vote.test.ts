import { env, runInDurableObject } from "cloudflare:test";
import { generateId } from "@shared/ids.ts";
import { ROOM_TTL_MS } from "@shared/limits.ts";
import type { RoomState, ServerMessage } from "@shared/protocol.ts";
import type { Room } from "@room/Room.ts";
import { describe, expect, it } from "vitest";
import { connect, createRoom, type TestSocket } from "./helpers.ts";

async function join(
  roomId: string,
  opts: { sessionId?: string; facilitatorToken?: string } = {},
) {
  const socket = await connect(roomId);
  const sessionId = opts.sessionId ?? generateId();
  socket.send({
    type: "join",
    sessionId,
    displayName: "Ana",
    avatarId: null,
    ...(opts.facilitatorToken
      ? { facilitatorToken: opts.facilitatorToken }
      : {}),
  });
  const state = (await socket.nextMessage()) as RoomState;
  return { socket, state, sessionId };
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

const isState =
  (p: (s: RoomState) => boolean) =>
  (m: ServerMessage): boolean =>
    m.type === "room_state" && p(m);

function roomStub(roomId: string) {
  return env.ROOM.get(env.ROOM.idFromName(roomId));
}

describe("vote", () => {
  it("recusa carta fora do baralho com invalid_card", async () => {
    const { roomId } = await createRoom();
    const ana = await join(roomId);
    ana.socket.send({ type: "vote", card: "7" });
    const err = await next(ana.socket, (m) => m.type === "error");
    expect(err).toMatchObject({ code: "invalid_card" });
  });

  it("recusa facilitador e observador com forbidden", async () => {
    const { roomId, facilitatorToken } = await createRoom();
    const fac = await join(roomId, { facilitatorToken });
    fac.socket.send({ type: "vote", card: "5" });
    expect(await next(fac.socket, (m) => m.type === "error")).toMatchObject({
      code: "forbidden",
    });

    const ana = await join(roomId);
    await runInDurableObject(roomStub(roomId), (_i: Room, state) => {
      state.storage.sql.exec(
        "UPDATE participants SET is_observer = 1 WHERE session_id = ?",
        ana.sessionId,
      );
    });
    ana.socket.send({ type: "vote", card: "5" });
    expect(await next(ana.socket, (m) => m.type === "error")).toMatchObject({
      code: "forbidden",
    });
  });

  it("recusa voto com a rodada revelada com round_not_voting", async () => {
    const { roomId } = await createRoom();
    const ana = await join(roomId);
    await runInDurableObject(roomStub(roomId), (_i: Room, state) => {
      state.storage.sql.exec("UPDATE rounds SET status = 'revealed'");
    });
    ana.socket.send({ type: "vote", card: "5" });
    expect(await next(ana.socket, (m) => m.type === "error")).toMatchObject({
      code: "round_not_voting",
    });
  });

  it("voto válido renova last_activity_at e o Alarm; troca substitui a linha", async () => {
    const { roomId } = await createRoom();
    const ana = await join(roomId);
    const stub = roomStub(roomId);
    await runInDurableObject(stub, async (_i: Room, state) => {
      state.storage.sql.exec("UPDATE room SET last_activity_at = 1");
      await state.storage.setAlarm(Date.now() + 1000);
    });

    const before = Date.now();
    ana.socket.send({ type: "vote", card: "5" });
    await next(
      ana.socket,
      isState((s) => s.you.myVote === "5"),
    );
    ana.socket.send({ type: "vote", card: "8" });
    const s = (await next(
      ana.socket,
      isState((s) => s.you.myVote === "8"),
    )) as RoomState;
    expect(s.you.myVote).toBe("8");

    await runInDurableObject(stub, async (_i: Room, state) => {
      const rows = state.storage.sql
        .exec<{ card: string }>("SELECT card FROM votes")
        .toArray();
      expect(rows).toEqual([{ card: "8" }]);
      const { last_activity_at } = state.storage.sql
        .exec<{ last_activity_at: number }>("SELECT last_activity_at FROM room")
        .one();
      expect(last_activity_at).toBeGreaterThanOrEqual(before);
      const alarm = await state.storage.getAlarm();
      expect(alarm).toBeGreaterThanOrEqual(before + ROOM_TTL_MS);
    });
  });

  it("hasVoted vale para todas as conexões e o valor só vai para o próprio votante", async () => {
    const { roomId, facilitatorToken } = await createRoom();
    const fac = await join(roomId, { facilitatorToken });
    const ana = await join(roomId);
    const caio = await join(roomId);
    const anaId = ana.state.you.participantId;

    ana.socket.send({ type: "vote", card: "13" });
    const pred = isState(
      (s) => s.participants.find((p) => p.participantId === anaId)!.hasVoted,
    );
    const seenFac = (await next(fac.socket, pred)) as RoomState;
    const seenCaio = (await next(caio.socket, pred)) as RoomState;

    for (const seen of [seenFac, seenCaio]) {
      expect(seen.you.myVote).toBeNull();
      expect(seen.round.votes).toBeNull();
      expect(JSON.stringify(seen)).not.toContain('"13"}');
      expect(
        seen.participants.find((p) => p.participantId === anaId),
      ).toMatchObject({
        hasVoted: true,
      });
    }
    const own = (await next(
      ana.socket,
      isState((s) => s.you.myVote === "13"),
    )) as RoomState;
    expect(own.you.myVote).toBe("13");
  });
});
