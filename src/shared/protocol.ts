import { z } from "zod";
import { DECK_TYPES } from "./decks.ts";
import { isValidId } from "./ids.ts";
import { DISPLAY_NAME_MAX, ROOM_NAME_MAX, ROUND_TITLE_MAX } from "./limits.ts";

const id = z.string().refine(isValidId, "ID inválido");
const deckType = z.enum(DECK_TYPES);
const card = z.string();
const trimmed = (max: number, min = 1) => z.string().trim().min(min).max(max);

// HTTP

export const createRoomRequestSchema = z.object({
  name: trimmed(ROOM_NAME_MAX),
  deckType,
});
export type CreateRoomRequest = z.infer<typeof createRoomRequestSchema>;

export const createRoomResponseSchema = z.object({
  roomId: id,
  facilitatorToken: id,
});
export type CreateRoomResponse = z.infer<typeof createRoomResponseSchema>;

export const httpErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
export type HttpError = z.infer<typeof httpErrorSchema>;

// WebSocket: cliente → servidor

export const joinMessageSchema = z.object({
  type: z.literal("join"),
  sessionId: id,
  displayName: trimmed(DISPLAY_NAME_MAX),
  avatarId: z.string().min(1).nullable(),
  facilitatorToken: z.string().optional(),
});

export const voteMessageSchema = z.object({
  type: z.literal("vote"),
  card,
});

export const setObserverMessageSchema = z.object({
  type: z.literal("set_observer"),
  participantId: id,
  observer: z.boolean(),
});

export const setTitleMessageSchema = z.object({
  type: z.literal("set_title"),
  title: trimmed(ROUND_TITLE_MAX, 0),
});

export const revealMessageSchema = z.object({ type: z.literal("reveal") });

export const newRoundMessageSchema = z.object({
  type: z.literal("new_round"),
});

export const clientMessageSchema = z.discriminatedUnion("type", [
  joinMessageSchema,
  voteMessageSchema,
  setObserverMessageSchema,
  setTitleMessageSchema,
  revealMessageSchema,
  newRoundMessageSchema,
]);
export type ClientMessage = z.infer<typeof clientMessageSchema>;

// WebSocket: servidor → cliente

export const errorCodeSchema = z.enum([
  "invalid_message",
  "not_joined",
  "forbidden",
  "invalid_card",
  "invalid_target",
  "validation_error",
  "round_not_voting",
  "round_not_revealed",
  "reveal_blocked",
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const errorMessageSchema = z.object({
  type: z.literal("error"),
  code: errorCodeSchema,
  message: z.string(),
});

const participantSchema = z.object({
  participantId: id,
  displayName: z.string(),
  avatarId: z.string().nullable(),
  isFacilitator: z.boolean(),
  isObserver: z.boolean(),
  connected: z.boolean(),
  hasVoted: z.boolean(),
});

const resultSchema = z.object({
  median: z.number().nullable(),
  modes: z.array(z.number()),
  distribution: z.array(z.object({ card, count: z.number().int() })),
});

export const roomStateMessageSchema = z.object({
  type: z.literal("room_state"),
  room: z.object({
    name: z.string(),
    deckType,
    deck: z.array(card),
  }),
  you: z.object({
    participantId: id,
    isFacilitator: z.boolean(),
    isObserver: z.boolean(),
    myVote: card.nullable(),
  }),
  participants: z.array(participantSchema),
  round: z.object({
    number: z.number().int(),
    title: z.string().nullable(),
    status: z.enum(["voting", "revealed"]),
    missingVotes: z.number().int(),
    canReveal: z.boolean(),
    votes: z.array(z.object({ participantId: id, card })).nullable(),
    result: resultSchema.nullable(),
  }),
  history: z.array(
    z.object({
      number: z.number().int(),
      title: z.string().nullable(),
      median: z.number().nullable(),
      modes: z.array(z.number()),
    }),
  ),
});
export type RoomState = z.infer<typeof roomStateMessageSchema>;

export const serverMessageSchema = z.discriminatedUnion("type", [
  roomStateMessageSchema,
  errorMessageSchema,
]);
export type ServerMessage = z.infer<typeof serverMessageSchema>;
