import { generateId } from "@shared/ids.ts";
import { ROOM_TTL_MS } from "@shared/limits.ts";
import type { RoomState } from "@shared/protocol.ts";
import type { Room } from "@room/Room.ts";
import {
  env,
  runDurableObjectAlarm,
  runInDurableObject,
} from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { connect, createRoom } from "./helpers.ts";

const stubOf = (roomId: string) => env.ROOM.get(env.ROOM.idFromName(roomId));

async function join(roomId: string, name = "Ana") {
  const socket = await connect(roomId);
  socket.send({
    type: "join",
    sessionId: generateId(),
    displayName: name,
    avatarId: null,
  });
  const state = (await socket.nextMessage()) as RoomState;
  return { socket, state };
}

describe("expiração em 30 dias (FR-023, FR-007)", () => {
  it("após o Alarm apaga o armazenamento e fecha conexões abertas e novas com 4404", async () => {
    const { roomId } = await createRoom();
    const { socket } = await join(roomId);
    const stub = stubOf(roomId);

    expect(await runDurableObjectAlarm(stub)).toBe(true);

    expect((await socket.closed).code).toBe(4404);

    const leftovers = await runInDurableObject(stub, async (_i, state) => ({
      rows: ["room", "participants", "rounds", "votes"].map(
        (t) => state.storage.sql.exec(`SELECT COUNT(*) AS n FROM ${t}`).one().n,
      ),
      alarm: await state.storage.getAlarm(),
    }));
    expect(leftovers).toEqual({ rows: [0, 0, 0, 0], alarm: null });

    const fresh = await connect(roomId);
    expect((await fresh.closed).code).toBe(4404);
  });

  it("join sem voto nem nova rodada não altera last_activity_at nem o Alarm", async () => {
    const { roomId } = await createRoom();
    const stub = stubOf(roomId);
    const snapshot = () =>
      runInDurableObject(stub, async (_i: Room, state) => ({
        last: state.storage.sql
          .exec<{ last_activity_at: number }>(
            "SELECT last_activity_at FROM room",
          )
          .one().last_activity_at,
        alarm: await state.storage.getAlarm(),
      }));

    const before = await snapshot();
    expect(before.alarm).not.toBeNull();
    expect(before.alarm! - before.last).toBe(ROOM_TTL_MS);

    await new Promise((r) => setTimeout(r, 20));
    await join(roomId, "Ana");
    await join(roomId, "Bia");

    expect(await snapshot()).toEqual(before);
  });
});
