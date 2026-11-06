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
const titleIs = (title: string | null) => (m: ServerMessage) =>
  m.type === "room_state" && m.round.title === title;

describe("set_title", () => {
  it("aceita título de 250 caracteres e remove espaços nas pontas", async () => {
    const { roomId, facilitatorToken } = await createRoom();
    const fac = await join(roomId, { facilitatorToken });
    const ana = await join(roomId);

    const title = "a".repeat(250);
    fac.socket.send({ type: "set_title", title: `  ${title}  ` });
    for (const s of [fac, ana]) {
      const state = (await next(s.socket, titleIs(title))) as RoomState;
      expect(state.round.title).toBe(title);
    }
  });

  it("recusa título de 251 caracteres com validation_error", async () => {
    const { roomId, facilitatorToken } = await createRoom();
    const fac = await join(roomId, { facilitatorToken });
    fac.socket.send({ type: "set_title", title: "a".repeat(251) });
    expect(await next(fac.socket, isError)).toMatchObject({
      code: "validation_error",
    });
  });

  it("título vazio limpa o título (NULL)", async () => {
    const { roomId, facilitatorToken } = await createRoom();
    const fac = await join(roomId, { facilitatorToken });
    fac.socket.send({ type: "set_title", title: "Login com Google" });
    await next(fac.socket, titleIs("Login com Google"));

    fac.socket.send({ type: "set_title", title: "   " });
    const state = (await next(fac.socket, titleIs(null))) as RoomState;
    expect(state.round.title).toBeNull();
  });

  it("recusa não facilitador com forbidden", async () => {
    const { roomId } = await createRoom();
    const ana = await join(roomId);
    ana.socket.send({ type: "set_title", title: "Login" });
    expect(await next(ana.socket, isError)).toMatchObject({
      code: "forbidden",
    });
  });

  it("recusa com round_not_voting após a revelação", async () => {
    const { roomId, facilitatorToken } = await createRoom();
    const fac = await join(roomId, { facilitatorToken });
    const ana = await join(roomId);
    ana.socket.send({ type: "vote", card: "5" });
    await next(fac.socket, (m) => m.type === "room_state" && m.round.canReveal);
    fac.socket.send({ type: "reveal" });
    await next(
      fac.socket,
      (m) => m.type === "room_state" && m.round.status === "revealed",
    );

    fac.socket.send({ type: "set_title", title: "Tarde demais" });
    expect(await next(fac.socket, isError)).toMatchObject({
      code: "round_not_voting",
    });
  });
});
