import { DurableObject } from "cloudflare:workers";
import { DECKS, type DeckType } from "@shared/decks.ts";
import {
  type ClientMessage,
  type ErrorCode,
  type RoomState,
  type ServerMessage,
  clientMessageSchema,
} from "@shared/protocol.ts";
import { applySchema } from "./schema.ts";

export const ROOM_NOT_FOUND_CLOSE_CODE = 4404;

interface Attachment {
  sessionId: string;
}

interface ParticipantRow extends Record<string, SqlStorageValue> {
  session_id: string;
  participant_id: string;
  display_name: string;
  avatar_id: string | null;
  is_facilitator: number;
  is_observer: number;
  connected: number;
}

export class Room extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => applySchema(ctx.storage.sql));
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected websocket", { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    if (!this.roomExists()) {
      server.close(ROOM_NOT_FOUND_CLOSE_CODE, "room_not_found");
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(
    ws: WebSocket,
    data: string | ArrayBuffer,
  ): Promise<void> {
    const message = this.parse(data);
    if (!message) {
      return this.sendError(ws, "invalid_message", "Mensagem inválida");
    }
    const attachment = ws.deserializeAttachment() as Attachment | null;
    if (!attachment && message.type !== "join") {
      return this.sendError(ws, "not_joined", "Envie join primeiro");
    }
    // Os handlers de negócio (join, vote etc.) chegam nas issues das histórias.
    this.sendError(ws, "invalid_message", "Mensagem não suportada");
  }

  override async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    // 1005/1006 não podem ser enviados em um close frame.
    ws.close(code === 1005 || code === 1006 ? 1000 : code);
  }

  /** Envia a cada conexão com `join` feito o `room_state` personalizado. */
  broadcastRoomState(): void {
    for (const ws of this.ctx.getWebSockets()) {
      const attachment = ws.deserializeAttachment() as Attachment | null;
      if (!attachment) continue;
      const state = this.buildRoomState(attachment.sessionId);
      if (state) this.send(ws, state);
    }
  }

  /** Monta o `room_state` do ponto de vista de `sessionId`, ou null se desconhecido. */
  buildRoomState(sessionId: string): RoomState | null {
    const sql = this.ctx.storage.sql;
    const room = sql
      .exec<{
        name: string;
        deck_type: DeckType;
        current_round: number;
      }>("SELECT name, deck_type, current_round FROM room")
      .toArray()[0];
    if (!room) return null;

    const participants = sql
      .exec<ParticipantRow>(
        "SELECT session_id, participant_id, display_name, avatar_id, is_facilitator, is_observer, connected FROM participants ORDER BY rowid",
      )
      .toArray();
    const me = participants.find((p) => p.session_id === sessionId);
    if (!me) return null;

    const round = sql
      .exec<{
        number: number;
        title: string | null;
        status: "voting" | "revealed";
        median: number | null;
        mode: string | null;
      }>(
        "SELECT number, title, status, median, mode FROM rounds WHERE number = ?",
        room.current_round,
      )
      .toArray()[0];
    if (!round) return null;

    const deck = DECKS[room.deck_type];
    const votes = sql
      .exec<{ session_id: string; card: string }>(
        "SELECT session_id, card FROM votes WHERE round_number = ?",
        round.number,
      )
      .toArray();
    const voted = new Set(votes.map((v) => v.session_id));
    const voters = participants.filter(
      (p) => p.connected && !p.is_facilitator && !p.is_observer,
    );
    const missingVotes = voters.filter((p) => !voted.has(p.session_id)).length;
    const revealed = round.status === "revealed";

    const idOf = new Map(
      participants.map((p) => [p.session_id, p.participant_id]),
    );
    const result = revealed
      ? {
          median: round.median,
          modes: JSON.parse(round.mode ?? "[]") as number[],
          distribution: deck
            .map((card) => ({
              card: card as string,
              count: votes.filter((v) => v.card === card).length,
            }))
            .filter((d) => d.count > 0),
        }
      : null;

    const history = sql
      .exec<{
        number: number;
        title: string | null;
        median: number | null;
        mode: string | null;
      }>(
        "SELECT number, title, median, mode FROM rounds WHERE status = 'archived' ORDER BY number DESC",
      )
      .toArray()
      .map((r) => ({
        number: r.number,
        title: r.title,
        median: r.median,
        modes: JSON.parse(r.mode ?? "[]") as number[],
      }));

    return {
      type: "room_state",
      room: { name: room.name, deckType: room.deck_type, deck: [...deck] },
      you: {
        participantId: me.participant_id,
        isFacilitator: me.is_facilitator === 1,
        isObserver: me.is_observer === 1,
        myVote: votes.find((v) => v.session_id === sessionId)?.card ?? null,
      },
      participants: participants.map((p) => ({
        participantId: p.participant_id,
        displayName: p.display_name,
        avatarId: p.avatar_id,
        isFacilitator: p.is_facilitator === 1,
        isObserver: p.is_observer === 1,
        connected: p.connected === 1,
        hasVoted: voted.has(p.session_id),
      })),
      round: {
        number: round.number,
        title: round.title,
        status: round.status,
        missingVotes,
        canReveal: !revealed && voters.length > 0 && missingVotes === 0,
        votes: revealed
          ? votes.map((v) => ({
              participantId: idOf.get(v.session_id) ?? "",
              card: v.card,
            }))
          : null,
        result,
      },
      history,
    } satisfies RoomState;
  }

  private roomExists(): boolean {
    return (
      this.ctx.storage.sql.exec("SELECT 1 FROM room LIMIT 1").toArray().length >
      0
    );
  }

  private parse(data: string | ArrayBuffer): ClientMessage | null {
    if (typeof data !== "string") return null;
    let json: unknown;
    try {
      json = JSON.parse(data);
    } catch {
      return null;
    }
    const parsed = clientMessageSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  }

  private send(ws: WebSocket, message: ServerMessage): void {
    ws.send(JSON.stringify(message));
  }

  private sendError(ws: WebSocket, code: ErrorCode, message: string): void {
    this.send(ws, { type: "error", code, message });
  }
}
