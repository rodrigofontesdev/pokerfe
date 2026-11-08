import {
  joinMessageSchema,
  serverMessageSchema,
  type RoomState,
} from "@shared/protocol.ts";
import {
  getFacilitatorToken,
  getProfile,
  getSessionId,
  type Profile,
} from "@client/storage/local.ts";

export const ROOM_NOT_FOUND_CLOSE_CODE = 4404;

export type ErrorMessage = Extract<
  ReturnType<typeof serverMessageSchema.parse>,
  { type: "error" }
>;

export function buildWsUrl(
  roomId: string,
  loc: { protocol: string; host: string } = location,
): string {
  const scheme = loc.protocol === "https:" ? "wss:" : "ws:";
  return `${scheme}//${loc.host}/api/rooms/${roomId}/ws`;
}

type SocketLike = {
  send(data: string): void;
  close(): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: { code: number }) => void) | null;
};

export type SocketFactory = (url: string) => SocketLike;

export type RoomConnectionOptions = {
  roomId: string;
  profile?: Profile | null;
  url?: string;
  createSocket?: SocketFactory;
  onState: (state: RoomState) => void;
  onError: (error: ErrorMessage) => void;
  onNotFound: () => void;
  /** Aguarda `join()` em vez de entrar ao abrir a conexão. */
  deferJoin?: boolean;
  onClose?: (code: number) => void;
};

export function createRoomConnection(options: RoomConnectionOptions): {
  close: () => void;
  join: (profile: Profile) => void;
  vote: (card: string) => void;
  setObserver: (participantId: string, observer: boolean) => void;
  setTitle: (title: string) => void;
  reveal: () => void;
  newRound: () => void;
} {
  const url = options.url ?? buildWsUrl(options.roomId);
  const socket = (options.createSocket ?? ((u) => new WebSocket(u)))(url);
  let closed = false;
  let opened = false;
  let pending: Profile | null = null;

  function sendJoin(profile: Profile | null) {
    const token = getFacilitatorToken(options.roomId);
    const join = joinMessageSchema.safeParse({
      type: "join",
      sessionId: getSessionId(),
      displayName: profile?.displayName ?? "",
      avatarId: profile?.avatarId ?? null,
      ...(token ? { facilitatorToken: token } : {}),
    });
    if (join.success) socket.send(JSON.stringify(join.data));
  }

  socket.onopen = () => {
    opened = true;
    if (pending) sendJoin(pending);
    else if (!options.deferJoin) sendJoin(options.profile ?? getProfile());
    else {
      // No servidor de dev (Vite + Miniflare) o fechamento 4404 de uma conexão
      // ociosa só chega depois de o cliente enviar algo. Tipo desconhecido é
      // respondido com invalid_message e a conexão continua aberta (contrato).
      socket.send(JSON.stringify({ type: "probe" }));
    }
  };

  socket.onmessage = (event: { data: unknown }) => {
    if (closed || typeof event.data !== "string") return;
    let json: unknown;
    try {
      json = JSON.parse(event.data);
    } catch {
      return;
    }
    const parsed = serverMessageSchema.safeParse(json);
    if (!parsed.success) return;
    if (parsed.data.type === "room_state") options.onState(parsed.data);
    else options.onError(parsed.data);
  };

  socket.onclose = (event: { code: number }) => {
    if (closed) return;
    closed = true;
    if (event.code === ROOM_NOT_FOUND_CLOSE_CODE) options.onNotFound();
    options.onClose?.(event.code);
  };

  return {
    close() {
      closed = true;
      socket.close();
    },
    vote(card) {
      if (closed || !opened) return;
      socket.send(JSON.stringify({ type: "vote", card }));
    },
    setObserver(participantId, observer) {
      if (closed || !opened) return;
      socket.send(
        JSON.stringify({ type: "set_observer", participantId, observer }),
      );
    },
    setTitle(title) {
      if (closed || !opened) return;
      socket.send(JSON.stringify({ type: "set_title", title }));
    },
    reveal() {
      if (closed || !opened) return;
      socket.send(JSON.stringify({ type: "reveal" }));
    },
    newRound() {
      if (closed || !opened) return;
      socket.send(JSON.stringify({ type: "new_round" }));
    },
    join(profile) {
      if (closed) return;
      if (opened) sendJoin(profile);
      else pending = profile;
    },
  };
}
