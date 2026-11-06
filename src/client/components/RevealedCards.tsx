import type { RoomState } from "@shared/protocol.ts";
import type { DeckType } from "@shared/decks.ts";
import { Avatar } from "./Avatar.tsx";

export function RevealedCards({
  votes,
  participants,
  deckType,
}: {
  votes: NonNullable<RoomState["round"]["votes"]>;
  participants: RoomState["participants"];
  deckType: DeckType;
}) {
  const suffix = deckType === "time" ? "h" : "";
  return (
    <section aria-labelledby="revealed-heading">
      <h2 id="revealed-heading" className="text-lg font-semibold">
        Cartas reveladas
      </h2>
      <ul className="mt-3 flex flex-wrap gap-4">
        {votes.map((v) => {
          const p = participants.find(
            (x) => x.participantId === v.participantId,
          );
          if (!p) return null;
          return (
            <li
              key={v.participantId}
              className="flex flex-col items-center gap-1"
            >
              <span
                aria-label={`Voto de ${p.displayName}: ${v.card}${suffix}`}
                className="flex h-20 w-14 items-center justify-center rounded-lg border-2 border-blue-800 bg-blue-800 text-lg font-semibold text-white"
              >
                {v.card}
                {suffix}
              </span>
              <Avatar avatarId={p.avatarId} displayName={p.displayName} />
              <span className="max-w-20 truncate text-sm">{p.displayName}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
