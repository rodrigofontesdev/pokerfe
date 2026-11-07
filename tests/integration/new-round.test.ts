import { generateId } from "@shared/ids.ts";
import { ROOM_TTL_MS } from "@shared/limits.ts";
import type { RoomState, ServerMessage } from "@shared/protocol.ts";
import { env, runInDurableObject } from "cloudflare:test";
import type { Room } from "@room/Room.ts";
import { describe, expect, it } from "vitest";
import { connect, createRoom } from "./helpers.ts";

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
  socket: { nextMessage(): Promise<ServerMessage> },
  predicate: (m: ServerMessage) => boolean,
): Promise<ServerMessage> {
  for (;;) {
    const m = await socket.nextMessage();
    if (predicate(m)) return m;
  }
}

const isError = (m: ServerMessage) => m.type === "error";
const isState = (pred: (s: RoomState) => boolean) => (m: ServerMessage) =>
  m.type === "room_state" && pred(m);

async function revealRound(
  fac: Awaited<ReturnType<typeof join>>,
  ana: Awaited<ReturnType<typeof join>>,
  card = "5",
) {
  ana.socket.send({ type: "vote", card });
  await next(
    fac.socket,
    isState((s) => s.round.canReveal),
  );
  fac.socket.send({ type: "reveal" });
  await next(
    fac.socket,
    isState((s) => s.round.status === "revealed"),
  );
}

describe("new_round", () => {
  it("recusa com round_not_revealed enquanto a rodada está em votação", async () => {
    const { roomId, facilitatorToken } = await createRoom();
    const fac = await join(roomId, { facilitatorToken });
    fac.socket.send({ type: "new_round" });
    expect(await next(fac.socket, isError)).toMatchObject({
      code: "round_not_revealed",
    });
  });

  it("recusa não facilitador com forbidden", async () => {
    const { roomId, facilitatorToken } = await createRoom();
    const fac = await join(roomId, { facilitatorToken });
    const ana = await join(roomId);
    await revealRound(fac, ana);
    ana.socket.send({ type: "new_round" });
    expect(await next(ana.socket, isError)).toMatchObject({
      code: "forbidden",
    });
  });

  it("arquiva a rodada, abre a seguinte sem votos e envia o histórico a todos", async () => {
    const { roomId, facilitatorToken } = await createRoom();
    const fac = await join(roomId, { facilitatorToken });
    const ana = await join(roomId);

    fac.socket.send({ type: "set_title", title: "Login com Google" });
    await next(
      fac.socket,
      isState((s) => s.round.title === "Login com Google"),
    );
    await revealRound(fac, ana, "5");

    fac.socket.send({ type: "new_round" });
    for (const s of [fac, ana]) {
      const state = (await next(
        s.socket,
        isState((st) => st.round.number === 2),
      )) as RoomState;
      expect(state.round).toMatchObject({
        number: 2,
        title: null,
        status: "voting",
        votes: null,
        result: null,
      });
      expect(state.you.myVote).toBeNull();
      expect(state.participants.every((p) => !p.hasVoted)).toBe(true);
      expect(state.history).toEqual([
        { number: 1, title: "Login com Google", median: 5, modes: [] },
      ]);
    }

    await revealRound(fac, ana, "8");
    fac.socket.send({ type: "new_round" });
    const state = (await next(
      ana.socket,
      isState((st) => st.round.number === 3),
    )) as RoomState;
    expect(state.history.map((h) => h.number)).toEqual([2, 1]);
  });

  it("renova last_activity_at e o Alarm", async () => {
    const { roomId, facilitatorToken } = await createRoom();
    const fac = await join(roomId, { facilitatorToken });
    const ana = await join(roomId);
    await revealRound(fac, ana);
    const stub = env.ROOM.get(env.ROOM.idFromName(roomId));
    await runInDurableObject(stub, async (_i: Room, state) => {
      state.storage.sql.exec("UPDATE room SET last_activity_at = 1");
      await state.storage.setAlarm(Date.now() + 1000);
    });

    const before = Date.now();
    fac.socket.send({ type: "new_round" });
    await next(
      fac.socket,
      isState((s) => s.round.number === 2),
    );

    await runInDurableObject(stub, async (_i: Room, state) => {
      const { last_activity_at } = state.storage.sql
        .exec<{ last_activity_at: number }>("SELECT last_activity_at FROM room")
        .one();
      expect(last_activity_at).toBeGreaterThanOrEqual(before);
      expect(await state.storage.getAlarm()).toBeGreaterThanOrEqual(
        before + ROOM_TTL_MS,
      );
    });
  });
});
