import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildWsUrl,
  createRoomConnection,
} from "@client/realtime/connection.ts";
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

const state = {
  type: "room_state",
  room: { name: "Sala", deckType: "points", deck: ["1", "2"] },
  you: {
    participantId: id,
    isFacilitator: false,
    isObserver: false,
    myVote: null,
  },
  participants: [],
  round: {
    number: 1,
    title: null,
    status: "voting",
    missingVotes: 0,
    canReveal: false,
    votes: null,
    result: null,
  },
  history: [],
};

function setup() {
  const socket = new FakeSocket();
  const factory = vi.fn(() => socket);
  const handlers = {
    onState: vi.fn(),
    onError: vi.fn(),
    onNotFound: vi.fn(),
  };
  createRoomConnection({
    roomId: id,
    url: "ws://x/api/rooms/ws",
    profile: { displayName: "Ana", avatarId: "fox" },
    createSocket: factory,
    ...handlers,
  });
  return { socket, factory, ...handlers };
}

beforeEach(() => {
  resetMemoryForTests();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) =>
      k === `pokerfe:facilitatorToken:${id}` ? "tok123" : null,
    setItem: () => {},
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("buildWsUrl", () => {
  it("usa ws em http e wss em https", () => {
    expect(buildWsUrl("r1", { protocol: "http:", host: "h:1" })).toBe(
      "ws://h:1/api/rooms/r1/ws",
    );
    expect(buildWsUrl("r1", { protocol: "https:", host: "h" })).toBe(
      "wss://h/api/rooms/r1/ws",
    );
  });
});

describe("createRoomConnection", () => {
  it("envia join ao abrir", () => {
    const { socket } = setup();
    socket.onopen?.({});
    const join = JSON.parse(socket.sent[0]!);
    expect(join).toMatchObject({
      type: "join",
      displayName: "Ana",
      avatarId: "fox",
      facilitatorToken: "tok123",
    });
    expect(join.sessionId).toMatch(/^[0-9A-Za-z]{22}$/);
  });

  it("expõe room_state e error válidos", () => {
    const { socket, onState, onError } = setup();
    socket.onmessage?.({ data: JSON.stringify(state) });
    expect(onState).toHaveBeenCalledOnce();
    const err = { type: "error", code: "forbidden", message: "não" };
    socket.onmessage?.({ data: JSON.stringify(err) });
    expect(onError).toHaveBeenCalledWith(err);
  });

  it("ignora JSON inválido e mensagens fora do schema", () => {
    const { socket, onState, onError } = setup();
    socket.onmessage?.({ data: "{ruim" });
    socket.onmessage?.({ data: JSON.stringify({ type: "room_state" }) });
    socket.onmessage?.({ data: JSON.stringify({ type: "outra" }) });
    expect(onState).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("sinaliza sala não encontrada no fechamento 4404 sem reconectar", () => {
    const { socket, factory, onNotFound } = setup();
    socket.onclose?.({ code: 4404 });
    expect(onNotFound).toHaveBeenCalledOnce();
    expect(factory).toHaveBeenCalledOnce();
  });

  it("não sinaliza sala não encontrada em outros fechamentos", () => {
    const { socket, onNotFound } = setup();
    socket.onclose?.({ code: 1006 });
    expect(onNotFound).not.toHaveBeenCalled();
  });
});
