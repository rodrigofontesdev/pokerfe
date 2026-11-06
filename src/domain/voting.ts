export type VoteRefusal = "forbidden" | "round_not_voting" | "invalid_card";

export type CastVoteResult =
  | { ok: true; card: string }
  | {
      ok: false;
      code: VoteRefusal;
    };

/**
 * Valida um voto (FR-011, FR-013, FR-015): só votante (nem facilitador nem
 * observador), só com a rodada em `voting`, só com rótulo exato do baralho.
 */
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
