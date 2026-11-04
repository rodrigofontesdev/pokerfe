import { SELF, env, runInDurableObject } from "cloudflare:test";
import type { Room } from "@room/Room.ts";
import type { CreateRoomResponse, ServerMessage } from "@shared/protocol.ts";

/** Cria uma sala pelo endpoint público (disponível a partir da T029). */
export async function createRoom(
  name = "Sala de teste",
  deckType: "points" | "time" = "points",
): Promise<CreateRoomResponse> {
  const response = await SELF.fetch("https://example.com/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, deckType }),
  });
  if (response.status !== 201) {
    throw new Error(`createRoom falhou com ${response.status}`);
  }
  return (await response.json()) as CreateRoomResponse;
}

/** Grava a linha `room` direto no Durable Object, sem passar pela API. */
export async function seedRoom(roomId: string): Promise<void> {
  const stub = env.ROOM.get(env.ROOM.idFromName(roomId));
  await runInDurableObject(stub, (_instance: Room, state) => {
    const now = Date.now();
    state.storage.sql.exec(
      "INSERT INTO room VALUES (?, ?, ?, ?, ?, ?)",
      "Sala de teste",
      "points",
      now,
      now,
      "hash",
      1,
    );
  });
}

export interface TestSocket {
  ws: WebSocket;
  messages: ServerMessage[];
  closed: Promise<CloseEvent>;
  nextMessage(): Promise<ServerMessage>;
  send(data: string | object): void;
}

/** Abre uma conexão WebSocket contra o Worker. */
export async function connect(roomId: string): Promise<TestSocket> {
  const response = await SELF.fetch(
    `https://example.com/api/rooms/${roomId}/ws`,
    {
      headers: { Upgrade: "websocket" },
    },
  );
  const ws = response.webSocket;
  if (!ws) throw new Error(`upgrade falhou com ${response.status}`);
  ws.accept();

  const messages: ServerMessage[] = [];
  const waiters: Array<(m: ServerMessage) => void> = [];
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data as string) as ServerMessage;
    const waiter = waiters.shift();
    if (waiter) waiter(message);
    else messages.push(message);
  });
  const closed = new Promise<CloseEvent>((resolve) =>
    ws.addEventListener("close", resolve),
  );

  return {
    ws,
    messages,
    closed,
    nextMessage: () =>
      messages.length > 0
        ? Promise.resolve(messages.shift()!)
        : new Promise((resolve) => waiters.push(resolve)),
    send: (data) =>
      ws.send(typeof data === "string" ? data : JSON.stringify(data)),
  };
}
