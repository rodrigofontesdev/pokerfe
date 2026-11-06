import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import type { DeckType } from "@shared/decks.ts";

type CardDeckProps = {
  deck: readonly string[];
  deckType: DeckType;
  myVote: string | null;
  isFacilitator: boolean;
  isObserver: boolean;
  onVote: (card: string) => void;
};

const cardClass =
  "flex h-20 w-14 cursor-pointer items-center justify-center rounded-lg border-2 border-slate-400 bg-white text-lg font-semibold text-slate-900 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 data-[checked]:border-blue-800 data-[checked]:bg-blue-800 data-[checked]:text-white data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60";

/** Cartas do baralho da sala; oculto para o facilitador (FR-011), desabilitado para observador. */
export function CardDeck({
  deck,
  deckType,
  myVote,
  isFacilitator,
  isObserver,
  onVote,
}: CardDeckProps) {
  if (isFacilitator) return null;
  const suffix = deckType === "time" ? "h" : "";
  return (
    <section aria-labelledby="deck-heading">
      <h2 id="deck-heading" className="text-lg font-semibold">
        Escolha sua carta
      </h2>
      {isObserver && (
        <p className="mt-1 text-sm text-slate-700">Observadores não votam.</p>
      )}
      <RadioGroup
        aria-label="Cartas"
        value={myVote ?? ""}
        disabled={isObserver}
        onValueChange={(next) => {
          if (typeof next === "string" && next !== "") onVote(next);
        }}
        className="mt-3 flex flex-wrap gap-2"
      >
        {deck.map((card) => (
          <Radio.Root
            key={card}
            value={card}
            aria-label={card}
            className={cardClass}
          >
            {card}
            {suffix}
          </Radio.Root>
        ))}
      </RadioGroup>
    </section>
  );
}
