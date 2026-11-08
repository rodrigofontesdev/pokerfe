import { useState } from "react";
import { isValidId } from "@shared/ids.ts";
import { JoinForm } from "@client/components/JoinForm.tsx";
import { RoomNotFound } from "@client/components/RoomNotFound.tsx";
import { Avatar } from "@client/components/Avatar.tsx";
import { CardDeck } from "@client/components/CardDeck.tsx";
import { FacilitatorPanel } from "@client/components/FacilitatorPanel.tsx";
import { HistoryList } from "@client/components/HistoryList.tsx";
import { ResultPanel } from "@client/components/ResultPanel.tsx";
import { RevealedCards } from "@client/components/RevealedCards.tsx";
import { ParticipantList } from "@client/components/ParticipantList.tsx";
import { getFacilitatorToken } from "@client/storage/local.ts";
import { useRoomConnection } from "@client/realtime/useRoomConnection.ts";

export function Room({ roomId }: { roomId: string }) {
  if (!isValidId(roomId)) return <RoomNotFound />;
  return <ConnectedRoom roomId={roomId} />;
}

function ConnectedRoom({ roomId }: { roomId: string }) {
  const {
    roomState,
    notFound,
    lastError,
    status,
    join,
    vote,
    setObserver,
    setTitle,
    reveal,
    newRound,
  } = useRoomConnection(roomId);
  const [copied, setCopied] = useState<"ok" | "error" | null>(null);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied("ok");
    } catch {
      setCopied("error");
    }
  }

  const autoJoin = getFacilitatorToken(roomId) !== null;

  if (notFound) return <RoomNotFound />;

  if (!roomState) {
    if (status !== "closed" && !autoJoin) {
      return (
        <JoinForm
          serverError={
            lastError?.code === "validation_error" ? lastError.message : null
          }
          onJoin={join}
        />
      );
    }
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
      {roomState.round.title && (
        <h2 className="mt-6 text-xl font-semibold break-words">
          {roomState.round.title}
        </h2>
      )}
      {me && (
        <section className="mt-6 flex items-center gap-3">
          <Avatar avatarId={me.avatarId} displayName={me.displayName} />
          <span className="font-medium">{me.displayName}</span>
          {roomState.you.isFacilitator && (
            <span className="text-sm text-slate-600">Facilitador</span>
          )}
        </section>
      )}
      {roomState.round.status === "voting" && (
        <div className="mt-6">
          <CardDeck
            deck={roomState.room.deck}
            deckType={roomState.room.deckType}
            myVote={roomState.you.myVote}
            isFacilitator={roomState.you.isFacilitator}
            isObserver={roomState.you.isObserver}
            onVote={vote}
          />
        </div>
      )}
      {roomState.you.isFacilitator && (
        <div className="mt-6">
          <FacilitatorPanel
            key={roomState.round.number}
            revealed={roomState.round.status === "revealed"}
            canReveal={roomState.round.canReveal}
            missingVotes={roomState.round.missingVotes}
            title={roomState.round.title}
            onSetTitle={setTitle}
            onReveal={reveal}
            onNewRound={newRound}
          />
        </div>
      )}
      {roomState.round.status === "revealed" && roomState.round.votes && (
        <div className="mt-6">
          <RevealedCards
            votes={roomState.round.votes}
            participants={roomState.participants}
            deckType={roomState.room.deckType}
          />
        </div>
      )}
      {roomState.round.status === "revealed" && roomState.round.result && (
        <div className="mt-6">
          <ResultPanel
            result={roomState.round.result}
            deckType={roomState.room.deckType}
          />
        </div>
      )}
      <div className="mt-6">
        <HistoryList
          history={roomState.history}
          deckType={roomState.room.deckType}
        />
      </div>
      <div className="mt-6">
        <ParticipantList
          participants={roomState.participants}
          youId={roomState.you.participantId}
          isFacilitator={roomState.you.isFacilitator}
          onSetObserver={setObserver}
        />
      </div>
    </main>
  );
}
