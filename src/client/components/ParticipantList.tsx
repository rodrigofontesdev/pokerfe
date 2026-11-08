import type { RoomState } from "@shared/protocol.ts";
import { Button } from "@base-ui/react/button";
import { Avatar } from "./Avatar.tsx";

type Participant = RoomState["participants"][number];

function roleLabel(p: Participant): string {
  if (p.isFacilitator) return "Facilitador";
  if (p.isObserver) return "Observador";
  return "Votante";
}

export function ParticipantList({
  participants,
  youId,
  isFacilitator,
  onSetObserver,
}: {
  participants: Participant[];
  youId: string;
  isFacilitator: boolean;
  onSetObserver: (participantId: string, observer: boolean) => void;
}) {
  return (
    <section aria-labelledby="participants-heading">
      <h2 id="participants-heading" className="text-lg font-semibold">
        Participantes ({participants.length})
      </h2>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {participants.map((p) => {
          const canVote = !p.isFacilitator && !p.isObserver;
          return (
            <li
              key={p.participantId}
              className={`flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2 ${
                p.connected ? "" : "border-dashed bg-slate-50"
              }`}
            >
              <Avatar avatarId={p.avatarId} displayName={p.displayName} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {p.displayName}
                  {p.participantId === youId && (
                    <span className="ml-1 text-sm font-normal text-slate-600">
                      (você)
                    </span>
                  )}
                </p>
                <p className="text-sm text-slate-600">
                  {roleLabel(p)}
                  {!p.connected && " · Desconectado"}
                </p>
                {isFacilitator && p.participantId !== youId && (
                  <Button
                    onClick={() =>
                      onSetObserver(p.participantId, !p.isObserver)
                    }
                    className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-sm font-medium hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-700"
                  >
                    {p.isObserver
                      ? "Marcar como votante"
                      : "Marcar como observador"}
                  </Button>
                )}
              </div>
              {canVote && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-sm font-medium ${
                    p.hasVoted
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {p.hasVoted ? "Votou" : "Aguardando"}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
