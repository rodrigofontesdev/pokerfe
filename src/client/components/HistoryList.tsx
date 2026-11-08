import type { RoomState } from "@shared/protocol.ts";
import type { DeckType } from "@shared/decks.ts";
import { formatModes, formatNumber } from "@client/format.ts";

export function HistoryList({
  history,
  deckType,
}: {
  history: RoomState["history"];
  deckType: DeckType;
}) {
  return (
    <section aria-labelledby="history-heading">
      <h2 id="history-heading" className="text-lg font-semibold">
        Histórico
      </h2>
      {history.length === 0 ? (
        <p className="mt-2 text-sm text-slate-700">
          Nenhuma rodada concluída ainda
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {history.map((r) => (
            <li
              key={r.number}
              className="rounded-md border border-slate-300 px-4 py-3"
            >
              <p className="font-medium break-words">
                {r.title ?? `Rodada ${r.number}`}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                Mediana:{" "}
                {r.median === null ? "—" : formatNumber(r.median, deckType)} ·
                Moda: {formatModes(r.modes, deckType)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
