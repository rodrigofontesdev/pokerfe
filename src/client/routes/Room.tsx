import { useState } from "react";
import { Avatar } from "@client/components/Avatar.tsx";
import { ParticipantList } from "@client/components/ParticipantList.tsx";
import { useRoomConnection } from "@client/realtime/useRoomConnection.ts";

export function Room({ roomId }: { roomId: string }) {
  const { roomState } = useRoomConnection(roomId);
  const [copied, setCopied] = useState<"ok" | "error" | null>(null);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied("ok");
    } catch {
      setCopied("error");
    }
  }

  if (!roomState) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p>Conectando à sala…</p>
      </main>
    );
  }

  const me = roomState.participants.find(
    (p) => p.participantId === roomState.you.participantId,
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{roomState.room.name}</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={copyLink}
            className="rounded-md border border-slate-300 px-3 py-2 font-medium hover:bg-slate-100"
          >
            Copiar link
          </button>
          <span role="status" className="text-sm">
            {copied === "ok" && "Link copiado"}
            {copied === "error" && "Não foi possível copiar o link"}
          </span>
        </div>
      </header>
      {me && (
        <section className="mt-6 flex items-center gap-3">
          <Avatar avatarId={me.avatarId} displayName={me.displayName} />
          <span className="font-medium">{me.displayName}</span>
          {roomState.you.isFacilitator && (
            <span className="text-sm text-slate-600">Facilitador</span>
          )}
        </section>
      )}
      <div className="mt-6">
        <ParticipantList
          participants={roomState.participants}
          youId={roomState.you.participantId}
        />
      </div>
    </main>
  );
}
