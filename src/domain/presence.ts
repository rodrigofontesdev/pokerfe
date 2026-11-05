import type { Participant } from "./types.ts";

export interface ParticipantView {
  participantId: string;
  displayName: string;
  avatarId: string | null;
  isFacilitator: boolean;
  isObserver: boolean;
  connected: boolean;
  hasVoted: boolean;
}

export interface YouView {
  participantId: string;
  isFacilitator: boolean;
  isObserver: boolean;
}

export interface PresenceView {
  participants: ParticipantView[];
  you: YouView;
}

/**
 * Monta `participants` e `you` do `room_state`. Expõe só `participantId`
 * (nunca `sessionId`) e apenas se o participante já votou, nunca a carta.
 */
export function buildPresence(input: {
  participants: Participant[];
  votedSessionIds: ReadonlySet<string>;
  sessionId: string;
}): PresenceView | null {
  const me = input.participants.find((p) => p.sessionId === input.sessionId);
  if (!me) return null;
  return {
    participants: input.participants.map((p) => ({
      participantId: p.participantId,
      displayName: p.displayName,
      avatarId: p.avatarId,
      isFacilitator: p.isFacilitator,
      isObserver: p.isObserver,
      connected: p.connected,
      hasVoted: input.votedSessionIds.has(p.sessionId),
    })),
    you: {
      participantId: me.participantId,
      isFacilitator: me.isFacilitator,
      isObserver: me.isObserver,
    },
  };
}

/** Um participante está conectado enquanto houver ao menos uma conexão aberta. */
export function isConnected(openConnections: number): boolean {
  return openConnections > 0;
}
