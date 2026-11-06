export type RevealRefusal = "forbidden" | "round_not_voting" | "reveal_blocked";

export type RevealResult = { ok: true } | { ok: false; code: RevealRefusal };

interface RevealParticipant {
  sessionId: string;
  isFacilitator: boolean;
  isObserver: boolean;
  connected: boolean;
}

interface RevealInput {
  participants: readonly RevealParticipant[];
  votedSessionIds: ReadonlySet<string>;
}

function expectedVoters(participants: readonly RevealParticipant[]) {
  return participants.filter(
    (p) => p.connected && !p.isFacilitator && !p.isObserver,
  );
}

export function missingVotes(input: RevealInput): number {
  return expectedVoters(input.participants).filter(
    (p) => !input.votedSessionIds.has(p.sessionId),
  ).length;
}

export function canReveal(input: RevealInput): boolean {
  return (
    expectedVoters(input.participants).length > 0 && missingVotes(input) === 0
  );
}

export function reveal(
  input: RevealInput & {
    actor: { isFacilitator: boolean };
    roundStatus: "voting" | "revealed" | "archived";
  },
): RevealResult {
  if (!input.actor.isFacilitator) return { ok: false, code: "forbidden" };
  if (input.roundStatus !== "voting") {
    return { ok: false, code: "round_not_voting" };
  }
  if (!canReveal(input)) return { ok: false, code: "reveal_blocked" };
  return { ok: true };
}
