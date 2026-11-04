import { SELF, env, runInDurableObject } from "cloudflare:test";
import { generateId } from "@shared/ids.ts";
import type { HttpError } from "@shared/protocol.ts";
import { describe, expect, it } from "vitest";
import { connect, seedRoom } from "./helpers.ts";

const base = "https://example.com";

describe("roteamento do Worker", () => {
  it("responde 400 invalid_room_id para roomId fora do formato", async () => {
    const res = await SELF.fetch(`${base}/api/rooms/curto/ws`, {
      headers: { Upgrade: "websocket" },
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as HttpError).error.code).toBe(
      "invalid_room_id",
    );
  });

  it("responde 426 upgrade_required sem Upgrade", async () => {
    const res = await SELF.fetch(`${base}/api/rooms/${generateId()}/ws`);
    expect(res.status).toBe(426);
    expect(((await res.json()) as HttpError).error.code).toBe(
      "upgrade_required",
    );
  });

  it("responde 404 not_found para caminho desconhecido em /api/", async () => {
    const res = await SELF.fetch(`${base}/api/nada`);
    expect(res.status).toBe(404);
    expect(((await res.json()) as HttpError).error.code).toBe("not_found");
  });

  it("responde 405 method_not_allowed para método errado", async () => {
    const res = await SELF.fetch(`${base}/api/rooms`);
    expect(res.status).toBe(405);
    const ws = await SELF.fetch(`${base}/api/rooms/${generateId()}/ws`, {
      method: "POST",
    });
    expect(ws.status).toBe(405);
  });
});

describe("Room", () => {
  it("fecha com 4404 e não grava nada quando a sala não existe", async () => {
    const roomId = generateId();
    const socket = await connect(roomId);
    const close = await socket.closed;
    expect(close.code).toBe(4404);

    const stub = env.ROOM.get(env.ROOM.idFromName(roomId));
    const counts = await runInDurableObject(stub, (_i, state) =>
      ["room", "participants", "rounds", "votes"].map(
        (t) => state.storage.sql.exec(`SELECT COUNT(*) AS n FROM ${t}`).one().n,
      ),
    );
    expect(counts).toEqual([0, 0, 0, 0]);
  });

  it("responde invalid_message a texto que não é JSON sem fechar", async () => {
    const roomId = generateId();
    await seedRoom(roomId);
    const socket = await connect(roomId);
    socket.send("isto não é json");
    const reply = await socket.nextMessage();
    expect(reply).toMatchObject({ type: "error", code: "invalid_message" });

    socket.send({ type: "reveal" });
    const second = await socket.nextMessage();
    expect(second).toMatchObject({ type: "error", code: "not_joined" });
    socket.ws.close();
  });

  it("responde invalid_message a type desconhecido", async () => {
    const roomId = generateId();
    await seedRoom(roomId);
    const socket = await connect(roomId);
    socket.send({ type: "bogus" });
    expect(await socket.nextMessage()).toMatchObject({
      code: "invalid_message",
    });
    socket.ws.close();
  });
});
