import { SELF, env, runInDurableObject } from "cloudflare:test";
import { ROOM_TTL_MS } from "@shared/limits.ts";
import type { HttpError } from "@shared/protocol.ts";
import { describe, expect, it } from "vitest";
import { createRoom } from "./helpers.ts";

const url = "https://example.com/api/rooms";
const BASE62 = /^[0-9A-Za-z]{22}$/;

function post(body: unknown) {
  return SELF.fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function sha256Hex(value: string) {
  const d = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(d)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

describe("POST /api/rooms", () => {
  it("cria a sala e guarda só o hash do token, com Alarm de 30 dias", async () => {
    const before = Date.now();
    const res = await post({
      name: "  Sprint 42 - Checkout ",
      deckType: "points",
    });
    expect(res.status).toBe(201);
    const { roomId, facilitatorToken } = (await res.json()) as {
      roomId: string;
      facilitatorToken: string;
    };
    expect(roomId).toMatch(BASE62);
    expect(facilitatorToken).toMatch(BASE62);

    const stub = env.ROOM.get(env.ROOM.idFromName(roomId));
    const { row, alarm, rounds } = await runInDurableObject(
      stub,
      async (_i, state) => ({
        row: state.storage.sql.exec("SELECT * FROM room").one(),
        alarm: await state.storage.getAlarm(),
        rounds: state.storage.sql.exec("SELECT * FROM rounds").toArray(),
      }),
    );
    expect(row.name).toBe("Sprint 42 - Checkout");
    expect(row.facilitator_token_hash).toBe(await sha256Hex(facilitatorToken));
    expect(JSON.stringify(row)).not.toContain(facilitatorToken);
    expect(row.current_round).toBe(1);
    expect(rounds).toHaveLength(1);
    expect(rounds[0]!.status).toBe("voting");
    expect(alarm).toBeGreaterThanOrEqual(before + ROOM_TTL_MS);
    expect(alarm).toBeLessThanOrEqual(Date.now() + ROOM_TTL_MS);
  });

  it.each([
    ["JSON inválido", "não é json"],
    ["name ausente", { deckType: "points" }],
    ["name vazio após trim", { name: "   ", deckType: "points" }],
    ["name com 251 caracteres", { name: "a".repeat(251), deckType: "points" }],
    ["deckType inválido", { name: "x", deckType: "cartas" }],
  ])("400 invalid_request: %s", async (_label, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(((await res.json()) as HttpError).error.code).toBe(
      "invalid_request",
    );
  });

  it("aceita name com 250 caracteres e deckType time", async () => {
    expect(
      (await post({ name: "a".repeat(250), deckType: "time" })).status,
    ).toBe(201);
  });

  it("405 para outro método", async () => {
    const res = await SELF.fetch(url, { method: "PUT" });
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("POST");
  });

  it("gera salas distintas", async () => {
    const a = await createRoom();
    const b = await createRoom();
    expect(a.roomId).not.toBe(b.roomId);
  });
});
