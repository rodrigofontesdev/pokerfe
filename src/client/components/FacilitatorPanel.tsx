import { useState } from "react";
import { ROUND_TITLE_MAX } from "@shared/limits.ts";
import { Button } from "@base-ui/react/button";

export function FacilitatorPanel({
  canReveal,
  missingVotes,
  title,
  revealed,
  onSetTitle,
  onReveal,
  onNewRound,
}: {
  revealed: boolean;
  canReveal: boolean;
  missingVotes: number;
  title: string | null;
  onSetTitle: (title: string) => void;
  onReveal: () => void;
  onNewRound: () => void;
}) {
  const [draft, setDraft] = useState(title ?? "");
  return (
    <section aria-labelledby="facilitator-heading">
      <h2 id="facilitator-heading" className="text-lg font-semibold">
        Facilitador
      </h2>
      <form
        className="mt-3 flex items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSetTitle(draft);
        }}
      >
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          Título da rodada
          <input
            type="text"
            value={draft}
            maxLength={ROUND_TITLE_MAX}
            disabled={revealed}
            onChange={(event) => setDraft(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        <Button
          type="submit"
          disabled={revealed}
          className="rounded-md border border-slate-300 px-4 py-2 font-medium hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Salvar título
        </Button>
      </form>
      <div className="mt-3 flex items-center gap-3">
        <Button
          disabled={revealed || !canReveal}
          onClick={onReveal}
          className="rounded-md bg-blue-800 px-4 py-2 font-medium text-white hover:bg-blue-900 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Revelar cartas
        </Button>
        <Button
          disabled={!revealed}
          onClick={onNewRound}
          className="rounded-md border border-slate-300 px-4 py-2 font-medium hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Nova rodada
        </Button>
        {!revealed && !canReveal && (
          <p role="status" className="text-sm text-slate-700">
            {missingVotes > 0
              ? missingVotes === 1
                ? "Falta 1 voto"
                : `Faltam ${missingVotes} votos`
              : "Nenhum votante conectado"}
          </p>
        )}
      </div>
    </section>
  );
}
