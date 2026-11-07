import { DurableObject } from "cloudflare:workers";
import { DECKS, type DeckType } from "@shared/decks.ts";
import {
  type ClientMessage,
  type ErrorCode,
  type RoomState,
  type ServerMessage,
  clientMessageSchema,
  joinMessageSchema,
} from "@shared/protocol.ts";
import { generateId } from "@shared/ids.ts";
import { ROOM_TTL_MS } from "@shared/limits.ts";
import { createInitialRoomState } from "@domain/room.ts";
import { registerParticipant } from "@domain/participants.ts";
import { buildPresence, isConnected } from "@domain/presence.ts";
import { castVote } from "@domain/voting.ts";
import { setObserver } from "@domain/observers.ts";
import { canReveal, missingVotes, reveal } from "@domain/reveal.ts";
import { computeResult } from "@domain/stats.ts";
import type { Participant } from "@domain/types.ts";
import { constantTimeEqual, sha256Hex } from "./hash.ts";
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

  async initialize(input: {
    name: string;
    deckType: DeckType;
    facilitatorTokenHash: string;
  }): Promise<void> {
    if (this.roomExists()) throw new Error("room_already_exists");
    const now = Date.now();
    const { room, round } = createInitialRoomState({ ...input, now });
    const sql = this.ctx.storage.sql;
    sql.exec(
      "INSERT INTO room (name, deck_type, created_at, last_activity_at, facilitator_token_hash, current_round) VALUES (?, ?, ?, ?, ?, ?)",
      room.name,
      room.deckType,
      room.createdAt,
      room.lastActivityAt,
      room.facilitatorTokenHash,
      room.currentRound,
    );
    sql.exec(
      "INSERT INTO rounds (number, title, status, median, mode, revealed_at) VALUES (?, NULL, ?, NULL, NULL, NULL)",
      round.number,
      round.status,
    );
    await this.ctx.storage.setAlarm(now + ROOM_TTL_MS);
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected websocket", { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    if (!this.roomExists()) {
      // Fechar na hora pode perder o código 4404 no cliente; o Alarm fecha logo depois.
      await this.ctx.storage.setAlarm(Date.now() + 50);
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  override async alarm(): Promise<void> {
    if (this.roomExists()) return;
    for (const ws of this.ctx.getWebSockets()) {
      ws.close(ROOM_NOT_FOUND_CLOSE_CODE, "room_not_found");
    }
  }

  override async webSocketMessage(
    ws: WebSocket,
    data: string | ArrayBuffer,
  ): Promise<void> {
    const message = this.parse(data);
    if (!message) {
      if (this.isInvalidDisplayName(data)) {
        return this.sendError(
          ws,
          "validation_error",
          "Nome inválido: use de 1 a 45 caracteres",
        );
      }
      return this.sendError(ws, "invalid_message", "Mensagem inválida");
    }
    const attachment = ws.deserializeAttachment() as Attachment | null;
    if (!attachment && message.type !== "join") {
      return this.sendError(ws, "not_joined", "Envie join primeiro");
    }
    if (message.type === "join") {
      return this.handleJoin(ws, message);
    }
    if (message.type === "vote") {
      return this.handleVote(ws, attachment!.sessionId, message.card);
    }
    if (message.type === "set_observer") {
      return this.handleSetObserver(ws, attachment!.sessionId, message);
    }
    if (message.type === "reveal") {
      return this.handleReveal(ws, attachment!.sessionId);
    }
    // Os demais handlers chegam nas issues das histórias.
    this.sendError(ws, "invalid_message", "Mensagem não suportada");
  }

  override async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    // 1005/1006 não podem ser enviados em um close frame.
    ws.close(code === 1005 || code === 1006 ? 1000 : code);
    this.markDisconnected(ws);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    this.markDisconnected(ws);
  }

  /** Marca `connected = 0` quando a última conexão do `sessionId` fecha. */
  private markDisconnected(ws: WebSocket): void {
    const attachment = ws.deserializeAttachment() as Attachment | null;
    if (!attachment || !this.roomExists()) return;
    const open = this.ctx
      .getWebSockets()
      .filter(
        (other) =>
          other !== ws &&
          other.readyState === WebSocket.OPEN &&
          (other.deserializeAttachment() as Attachment | null)?.sessionId ===
            attachment.sessionId,
      ).length;
    if (isConnected(open)) return;
    this.ctx.storage.sql.exec(
      "UPDATE participants SET connected = 0, last_seen_at = ? WHERE session_id = ?",
      Date.now(),
      attachment.sessionId,
    );
    this.broadcastRoomState();
  }

  private async handleJoin(
    ws: WebSocket,
    message: Extract<ClientMessage, { type: "join" }>,
  ): Promise<void> {
    const sql = this.ctx.storage.sql;
    const room = sql
      .exec<{ facilitator_token_hash: string }>(
        "SELECT facilitator_token_hash FROM room",
      )
      .toArray()[0];
    if (!room) return;

    const hasValidToken =
      message.facilitatorToken !== undefined &&
      constantTimeEqual(
        await sha256Hex(message.facilitatorToken),
        room.facilitator_token_hash,
      );

    const row = sql
      .exec<ParticipantRow & { last_seen_at: number }>(
        "SELECT * FROM participants WHERE session_id = ?",
        message.sessionId,
      )
      .toArray()[0];
    const existing: Participant | null = row
      ? {
          sessionId: row.session_id,
          participantId: row.participant_id,
          displayName: row.display_name,
          avatarId: row.avatar_id,
          isFacilitator: row.is_facilitator === 1,
          isObserver: row.is_observer === 1,
          connected: row.connected === 1,
          lastSeenAt: row.last_seen_at,
        }
      : null;

    const p = registerParticipant({
      existing,
      sessionId: message.sessionId,
      displayName: message.displayName,
      avatarId: message.avatarId,
      hasValidFacilitatorToken: hasValidToken,
      newParticipantId: generateId(),
      now: Date.now(),
    });
    sql.exec(
      `INSERT INTO participants (session_id, participant_id, display_name, avatar_id, is_facilitator, is_observer, connected, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)
       ON CONFLICT(session_id) DO UPDATE SET display_name = excluded.display_name, avatar_id = excluded.avatar_id, connected = 1, last_seen_at = excluded.last_seen_at`,
      p.sessionId,
      p.participantId,
      p.displayName,
      p.avatarId,
      p.isFacilitator ? 1 : 0,
      p.isObserver ? 1 : 0,
      p.lastSeenAt,
    );
    ws.serializeAttachment({ sessionId: p.sessionId } satisfies Attachment);
    this.broadcastRoomState();
  }

  private async handleVote(
    ws: WebSocket,
    sessionId: string,
    card: string,
  ): Promise<void> {
    const sql = this.ctx.storage.sql;
    const room = sql
      .exec<{ deck_type: DeckType; current_round: number }>(
        "SELECT deck_type, current_round FROM room",
      )
      .toArray()[0];
    const me = sql
      .exec<{ is_facilitator: number; is_observer: number }>(
        "SELECT is_facilitator, is_observer FROM participants WHERE session_id = ?",
        sessionId,
      )
      .toArray()[0];
    const round = room
      ? sql
          .exec<{ status: "voting" | "revealed" | "archived" }>(
            "SELECT status FROM rounds WHERE number = ?",
            room.current_round,
          )
          .toArray()[0]
      : undefined;
    if (!room || !me || !round) return;

    const result = castVote({
      participant: {
        isFacilitator: me.is_facilitator === 1,
        isObserver: me.is_observer === 1,
      },
      roundStatus: round.status,
      deck: DECKS[room.deck_type],
      card,
    });
    if (!result.ok) {
      const messages: Record<typeof result.code, string> = {
        forbidden: "Você não pode votar",
        round_not_voting: "A rodada não está em votação",
        invalid_card: "Carta inválida para o baralho da sala",
      };
      return this.sendError(ws, result.code, messages[result.code]);
    }

    const now = Date.now();
    sql.exec(
      `INSERT INTO votes (round_number, session_id, card) VALUES (?, ?, ?)
       ON CONFLICT(round_number, session_id) DO UPDATE SET card = excluded.card`,
      room.current_round,
      sessionId,
      result.card,
    );
    sql.exec("UPDATE room SET last_activity_at = ?", now);
    sql.exec(
      "UPDATE participants SET last_seen_at = ? WHERE session_id = ?",
      now,
      sessionId,
    );
    await this.ctx.storage.setAlarm(now + ROOM_TTL_MS);
    this.broadcastRoomState();
  }

  private async handleSetObserver(
    ws: WebSocket,
    sessionId: string,
    message: Extract<ClientMessage, { type: "set_observer" }>,
  ): Promise<void> {
    const sql = this.ctx.storage.sql;
    const room = sql
      .exec<{ current_round: number }>("SELECT current_round FROM room")
      .toArray()[0];
    const actor = sql
      .exec<{ participant_id: string; is_facilitator: number }>(
        "SELECT participant_id, is_facilitator FROM participants WHERE session_id = ?",
        sessionId,
      )
      .toArray()[0];
    const target = sql
      .exec<{ session_id: string; participant_id: string }>(
        "SELECT session_id, participant_id FROM participants WHERE participant_id = ?",
        message.participantId,
      )
      .toArray()[0];
    const round = room
      ? sql
          .exec<{ status: "voting" | "revealed" | "archived" }>(
            "SELECT status FROM rounds WHERE number = ?",
            room.current_round,
          )
          .toArray()[0]
      : undefined;
    if (!room || !actor || !round) return;

    const result = setObserver({
      actor: {
        participantId: actor.participant_id,
        isFacilitator: actor.is_facilitator === 1,
      },
      target: target ? { participantId: target.participant_id } : null,
      observer: message.observer,
      roundStatus: round.status,
    });
    if (!result.ok) {
      const messages: Record<typeof result.code, string> = {
        forbidden: "Apenas o facilitador pode marcar observadores",
        invalid_target: "Participante inválido",
      };
      return this.sendError(ws, result.code, messages[result.code]);
    }

    sql.exec(
      "UPDATE participants SET is_observer = ? WHERE participant_id = ?",
      result.observer ? 1 : 0,
      message.participantId,
    );
    if (result.discardVote) {
      sql.exec(
        "DELETE FROM votes WHERE round_number = ? AND session_id = ?",
        room.current_round,
        target!.session_id,
      );
    }
    this.broadcastRoomState();
  }

  private handleReveal(ws: WebSocket, sessionId: string): void {
    const sql = this.ctx.storage.sql;
    const room = sql
      .exec<{ current_round: number }>("SELECT current_round FROM room")
      .toArray()[0];
    const actor = sql
      .exec<{ is_facilitator: number }>(
        "SELECT is_facilitator FROM participants WHERE session_id = ?",
        sessionId,
      )
      .toArray()[0];
    const round = room
      ? sql
          .exec<{ status: "voting" | "revealed" | "archived" }>(
            "SELECT status FROM rounds WHERE number = ?",
            room.current_round,
          )
          .toArray()[0]
      : undefined;
    if (!room || !actor || !round) return;

    const participants = sql
      .exec<ParticipantRow>("SELECT * FROM participants")
      .toArray()
      .map((p) => ({
        sessionId: p.session_id,
        isFacilitator: p.is_facilitator === 1,
        isObserver: p.is_observer === 1,
        connected: p.connected === 1,
      }));
    const votedSessionIds = new Set(
      sql
        .exec<{ session_id: string }>(
          "SELECT session_id FROM votes WHERE round_number = ?",
          room.current_round,
        )
        .toArray()
        .map((v) => v.session_id),
    );

    const result = reveal({
      actor: { isFacilitator: actor.is_facilitator === 1 },
      roundStatus: round.status,
      participants,
      votedSessionIds,
    });
    if (!result.ok) {
      const messages: Record<typeof result.code, string> = {
        forbidden: "Apenas o facilitador pode revelar as cartas",
        round_not_voting: "A rodada não está em votação",
        reveal_blocked: "Ainda faltam votos",
      };
      return this.sendError(ws, result.code, messages[result.code]);
    }

    const deckRow = sql
      .exec<{ deck_type: DeckType }>("SELECT deck_type FROM room")
      .toArray()[0]!;
    const cards = sql
      .exec<{ card: string }>(
        "SELECT card FROM votes WHERE round_number = ?",
        room.current_round,
      )
      .toArray()
      .map((v) => v.card);
    const stats = computeResult(cards, DECKS[deckRow.deck_type]);
    sql.exec(
      "UPDATE rounds SET status = 'revealed', revealed_at = ?, median = ?, mode = ? WHERE number = ?",
      Date.now(),
      stats.median,
      JSON.stringify(stats.modes),
      room.current_round,
    );
    this.broadcastRoomState();
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

    const rows = sql
      .exec<ParticipantRow & { last_seen_at: number }>(
        "SELECT * FROM participants ORDER BY rowid",
      )
      .toArray();
    const participants: Participant[] = rows.map((p) => ({
      sessionId: p.session_id,
      participantId: p.participant_id,
      displayName: p.display_name,
      avatarId: p.avatar_id,
      isFacilitator: p.is_facilitator === 1,
      isObserver: p.is_observer === 1,
      connected: p.connected === 1,
      lastSeenAt: p.last_seen_at,
    }));

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
    const presence = buildPresence({
      participants,
      votedSessionIds: voted,
      sessionId,
    });
    if (!presence) return null;
    const revealInput = { participants, votedSessionIds: voted };
    const revealed = round.status === "revealed";

    const idOf = new Map(
      participants.map((p) => [p.sessionId, p.participantId]),
    );
    const result = revealed
      ? {
          median: round.median,
          modes: JSON.parse(round.mode ?? "[]") as number[],
          distribution: computeResult(
            votes.map((v) => v.card),
            deck,
          ).distribution,
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
        ...presence.you,
        myVote: votes.find((v) => v.session_id === sessionId)?.card ?? null,
      },
      participants: presence.participants,
      round: {
        number: round.number,
        title: round.title,
        status: round.status,
        missingVotes: missingVotes(revealInput),
        canReveal: !revealed && canReveal(revealInput),
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

  /** `join` bem formado cujo único problema é o `displayName` (FR-008). */
  private isInvalidDisplayName(data: string | ArrayBuffer): boolean {
    if (typeof data !== "string") return false;
    let json: unknown;
    try {
      json = JSON.parse(data);
    } catch {
      return false;
    }
    const parsed = joinMessageSchema.safeParse(json);
    return (
      !parsed.success &&
      parsed.error.issues.every((issue) => issue.path[0] === "displayName")
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
