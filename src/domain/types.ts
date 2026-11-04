import type { DeckType } from "@shared/decks.ts";

export type { DeckType };

export type RoundStatus = "voting" | "revealed" | "archived";

export interface Room {
  name: string;
  deckType: DeckType;
  createdAt: number;
  lastActivityAt: number;
  facilitatorTokenHash: string;
  currentRound: number;
}

export interface Participant {
  sessionId: string;
  participantId: string;
  displayName: string;
  avatarId: string | null;
  isFacilitator: boolean;
  isObserver: boolean;
  connected: boolean;
  lastSeenAt: number;
}

export interface Round {
  number: number;
  title: string | null;
  status: RoundStatus;
  median: number | null;
  modes: number[] | null;
  revealedAt: number | null;
}

export interface Vote {
  roundNumber: number;
  sessionId: string;
  card: string;
}
