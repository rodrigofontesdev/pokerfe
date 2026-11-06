export type VoteRefusal = "forbidden" | "round_not_voting" | "invalid_card";

export type CastVoteResult =
  | { ok: true; card: string }
  | {
      ok: false;
      code: VoteRefusal;
    };

export function castVote(input: {
  participant: { isFacilitator: boolean; isObserver: boolean };
  roundStatus: "voting" | "revealed" | "archived";
  deck: readonly string[];
  card: string;
}): CastVoteResult {
  const { participant, roundStatus, deck, card } = input;
  if (participant.isFacilitator || participant.isObserver) {
    return { ok: false, code: "forbidden" };
  }
  if (roundStatus !== "voting") return { ok: false, code: "round_not_voting" };
  if (!deck.includes(card)) return { ok: false, code: "invalid_card" };
  return { ok: true, card };
}
