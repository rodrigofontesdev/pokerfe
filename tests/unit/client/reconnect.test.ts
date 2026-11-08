import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoomConnection } from "@client/realtime/connection.ts";
import { resetMemoryForTests } from "@client/storage/local.ts";

class FakeSocket {
  sent: string[] = [];
  closed = false;
  onopen: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: ((ev: { code: number }) => void) | null = null;
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.closed = true;
  }
}

const id = "aB3dE5fG7hI9jK1lM3nO5p";

function setup() {
  const sockets: FakeSocket[] = [];
  const createSocket = vi.fn(() => {
    const s = new FakeSocket();
    sockets.push(s);
    return s;
  });
  const handlers = {
    onState: vi.fn(),
    onError: vi.fn(),
    onNotFound: vi.fn(),
    onReconnecting: vi.fn(),
  };
  const connection = createRoomConnection({
    roomId: id,
    url: "ws://x/api/rooms/ws",
    profile: { displayName: "Ana", avatarId: "fox" },
    createSocket,
    ...handlers,
  });
  return { sockets, createSocket, connection, ...handlers };
}

beforeEach(() => {
  resetMemoryForTests();
  vi.useFakeTimers();
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {} });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("reconexão automática", () => {
  it("tenta em 0,5 s, 1 s, 2 s e depois a cada 2 s", () => {
    const { sockets, createSocket, onReconnecting } = setup();
    sockets[0]!.onclose?.({ code: 1006 });
    expect(onReconnecting).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(499);
    expect(createSocket).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(createSocket).toHaveBeenCalledTimes(2);

    sockets[1]!.onclose?.({ code: 1006 });
    vi.advanceTimersByTime(999);
    expect(createSocket).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1);
    expect(createSocket).toHaveBeenCalledTimes(3);

    sockets[2]!.onclose?.({ code: 1006 });
    vi.advanceTimersByTime(1999);
    expect(createSocket).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(1);
    expect(createSocket).toHaveBeenCalledTimes(4);

    sockets[3]!.onclose?.({ code: 1006 });
    vi.advanceTimersByTime(2000);
    expect(createSocket).toHaveBeenCalledTimes(5);
    sockets[4]!.onclose?.({ code: 1006 });
    vi.advanceTimersByTime(2000);
    expect(createSocket).toHaveBeenCalledTimes(6);
  });

  it("não tenta após fechamento 4404", () => {
    const { sockets, createSocket, onNotFound, onReconnecting } = setup();
    sockets[0]!.onclose?.({ code: 4404 });
    vi.advanceTimersByTime(60_000);
    expect(createSocket).toHaveBeenCalledTimes(1);
    expect(onNotFound).toHaveBeenCalledOnce();
    expect(onReconnecting).not.toHaveBeenCalled();
  });

  it("não tenta após close() explícito", () => {
    const { sockets, createSocket, connection } = setup();
    sockets[0]!.onclose?.({ code: 1006 });
    connection.close();
    vi.advanceTimersByTime(60_000);
    expect(createSocket).toHaveBeenCalledTimes(1);
  });

  it("reenvia join com o mesmo sessionId e reinicia o intervalo ao abrir", () => {
    const { sockets, createSocket } = setup();
    sockets[0]!.onopen?.({});
    const first = JSON.parse(sockets[0]!.sent[0]!);

    sockets[0]!.onclose?.({ code: 1006 });
    vi.advanceTimersByTime(500);
    sockets[1]!.onclose?.({ code: 1006 });
    vi.advanceTimersByTime(1000);
    sockets[2]!.onopen?.({});
    const rejoin = JSON.parse(sockets[2]!.sent[0]!);
    expect(rejoin).toMatchObject({
      type: "join",
      sessionId: first.sessionId,
      displayName: "Ana",
      avatarId: "fox",
    });

    sockets[2]!.onclose?.({ code: 1006 });
    vi.advanceTimersByTime(500);
    expect(createSocket).toHaveBeenCalledTimes(4);
  });

  it("reentra com o perfil informado em join() mesmo com deferJoin", () => {
    const sockets: FakeSocket[] = [];
    const connection = createRoomConnection({
      roomId: id,
      url: "ws://x",
      deferJoin: true,
      createSocket: () => {
        const s = new FakeSocket();
        sockets.push(s);
        return s;
      },
      onState: vi.fn(),
      onError: vi.fn(),
      onNotFound: vi.fn(),
    });
    sockets[0]!.onopen?.({});
    connection.join({ displayName: "Bia", avatarId: null });
    sockets[0]!.onclose?.({ code: 1006 });
    vi.advanceTimersByTime(500);
    sockets[1]!.onopen?.({});
    expect(JSON.parse(sockets[1]!.sent[0]!)).toMatchObject({
      type: "join",
      displayName: "Bia",
    });
  });
});
