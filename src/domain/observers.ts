export type SetObserverRefusal = "forbidden" | "invalid_target";

export type SetObserverResult =
  | { ok: true; observer: boolean; discardVote: boolean }
  | { ok: false; code: SetObserverRefusal };

/**
 * Alterna votante ⇄ observador (FR-010). Só o facilitador executa (FR-021) e
 * não pode marcar a si mesmo. Ao virar observador com a rodada em votação, o
 * voto da rodada atual deve ser descartado.
 */
export function setObserver(input: {
  actor: { participantId: string; isFacilitator: boolean };
  target: { participantId: string } | null;
  observer: boolean;
  roundStatus: "voting" | "revealed" | "archived";
}): SetObserverResult {
  const { actor, target, observer, roundStatus } = input;
  if (!actor.isFacilitator) return { ok: false, code: "forbidden" };
  if (!target || target.participantId === actor.participantId) {
    return { ok: false, code: "invalid_target" };
  }
  return {
    ok: true,
    observer,
    discardVote: observer && roundStatus === "voting",
  };
}
