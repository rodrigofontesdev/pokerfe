import { Button } from "@base-ui/react/button";

export function FacilitatorPanel({
  canReveal,
  missingVotes,
  onReveal,
}: {
  canReveal: boolean;
  missingVotes: number;
  onReveal: () => void;
}) {
  return (
    <section aria-labelledby="facilitator-heading">
      <h2 id="facilitator-heading" className="text-lg font-semibold">
        Facilitador
      </h2>
      <div className="mt-3 flex items-center gap-3">
        <Button
          disabled={!canReveal}
          onClick={onReveal}
          className="rounded-md bg-blue-800 px-4 py-2 font-medium text-white hover:bg-blue-900 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Revelar cartas
        </Button>
        {!canReveal && (
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
