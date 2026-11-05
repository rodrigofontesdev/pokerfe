import type { Participant } from "./types.ts";

export interface RegisterInput {
  existing: Participant | null;
  sessionId: string;
  displayName: string;
  avatarId: string | null;
  hasValidFacilitatorToken: boolean;
  newParticipantId: string;
  now: number;
}

export function registerParticipant(input: RegisterInput): Participant {
  const { existing } = input;
  if (existing) {
    return {
      ...existing,
      displayName: input.displayName,
      avatarId: input.avatarId,
      connected: true,
      lastSeenAt: input.now,
    };
  }
  return {
    sessionId: input.sessionId,
    participantId: input.newParticipantId,
    displayName: input.displayName,
    avatarId: input.avatarId,
    isFacilitator: input.hasValidFacilitatorToken,
    isObserver: false,
    connected: true,
    lastSeenAt: input.now,
  };
}
