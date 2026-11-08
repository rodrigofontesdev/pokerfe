export type SetTitleRefusal = "forbidden" | "round_not_voting";

export type SetTitleResult =
  { ok: true; title: string | null } | { ok: false; code: SetTitleRefusal };

export function setTitle(input: {
  actor: { isFacilitator: boolean };
  roundStatus: "voting" | "revealed" | "archived";
  title: string;
}): SetTitleResult {
  const { actor, roundStatus, title } = input;
  if (!actor.isFacilitator) return { ok: false, code: "forbidden" };
  if (roundStatus !== "voting") return { ok: false, code: "round_not_voting" };
  const trimmed = title.trim();
  return { ok: true, title: trimmed === "" ? null : trimmed };
}

export type NewRoundRefusal = "forbidden" | "round_not_revealed";

export type NewRoundResult =
  | { ok: true; archivedRound: number; nextRound: number }
  | { ok: false; code: NewRoundRefusal };

export function newRound(input: {
  actor: { isFacilitator: boolean };
  roundStatus: "voting" | "revealed" | "archived";
  currentRound: number;
}): NewRoundResult {
  const { actor, roundStatus, currentRound } = input;
  if (!actor.isFacilitator) return { ok: false, code: "forbidden" };
  if (roundStatus !== "revealed") {
    return { ok: false, code: "round_not_revealed" };
  }
  return { ok: true, archivedRound: currentRound, nextRound: currentRound + 1 };
}

export function sortHistory<T extends { number: number }>(
  archived: readonly T[],
): T[] {
  return [...archived].sort((a, b) => b.number - a.number);
}
