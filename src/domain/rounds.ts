export type SetTitleRefusal = "forbidden" | "round_not_voting";

export type SetTitleResult =
  { ok: true; title: string | null } | { ok: false; code: SetTitleRefusal };

/** O título já chega aparado pelo schema; vazio vira `null` (FR-017). */
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
