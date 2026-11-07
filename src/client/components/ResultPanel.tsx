import type { RoomState } from "@shared/protocol.ts";
import type { DeckType } from "@shared/decks.ts";
import { formatModes, formatNumber } from "@client/format.ts";

export function ResultPanel({
  result,
  deckType,
}: {
  result: NonNullable<RoomState["round"]["result"]>;
  deckType: DeckType;
}) {
  return (
    <section aria-labelledby="result-heading">
      <h2 id="result-heading" className="text-lg font-semibold">
        Resultado
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm text-slate-600">Mediana</dt>
          <dd className="text-2xl font-semibold">
            {result.median === null
              ? "—"
              : formatNumber(result.median, deckType)}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-600">Moda</dt>
          <dd className="text-2xl font-semibold">
            {formatModes(result.modes, deckType)}
          </dd>
        </div>
      </dl>
      <h3 className="mt-4 text-sm font-semibold">Distribuição</h3>
      <ul className="mt-2 flex flex-wrap gap-3">
        {result.distribution.map((d) => (
          <li
            key={d.card}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm"
          >
            <span className="font-semibold">
              {d.card}
              {deckType === "time" ? "h" : ""}
            </span>
            : {d.count} {d.count === 1 ? "voto" : "votos"}
          </li>
        ))}
      </ul>
    </section>
  );
}
