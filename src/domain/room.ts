import type { DeckType, Room, Round } from "./types.ts";

export interface InitialRoomInput {
  name: string;
  deckType: DeckType;
  facilitatorTokenHash: string;
  now: number;
}

export function createInitialRoomState(input: InitialRoomInput): {
  room: Room;
  round: Round;
} {
  return {
    room: {
      name: input.name,
      deckType: input.deckType,
      createdAt: input.now,
      lastActivityAt: input.now,
      facilitatorTokenHash: input.facilitatorTokenHash,
      currentRound: 1,
    },
    round: {
      number: 1,
      title: null,
      status: "voting",
      median: null,
      modes: null,
      revealedAt: null,
    },
  };
}
