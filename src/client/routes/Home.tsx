import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { AvatarId } from "@shared/avatars.ts";
import { isAvatarId } from "@shared/avatars.ts";
import { DECK_TYPES, type DeckType } from "@shared/decks.ts";
import { DISPLAY_NAME_MAX, ROOM_NAME_MAX } from "@shared/limits.ts";
import { createRoomResponseSchema } from "@shared/protocol.ts";
import { AvatarPicker } from "@client/components/AvatarPicker.tsx";
import {
  getProfile,
  saveFacilitatorToken,
  saveProfile,
} from "@client/storage/local.ts";

const DECK_LABELS: Record<DeckType, string> = {
  points: "Story points",
  time: "Tempo (horas)",
};

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-blue-600";

export function Home() {
  const navigate = useNavigate();
  const [initial] = useState(() => getProfile());
  const [roomName, setRoomName] = useState("");
  const [deckType, setDeckType] = useState<DeckType>("points");
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [avatarId, setAvatarId] = useState<AvatarId | null>(
    isAvatarId(initial?.avatarId) ? initial.avatarId : null,
  );
  const [errors, setErrors] = useState<{ room?: string; name?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const name = roomName.trim();
    const facilitator = displayName.trim();
    const next = {
      room: name ? undefined : "Informe o nome da sala",
      name: facilitator ? undefined : "Informe seu nome",
    };
    setErrors(next);
    setFailure(null);
    if (next.room || next.name) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, deckType }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const created = createRoomResponseSchema.parse(await response.json());
      saveFacilitatorToken(created.roomId, created.facilitatorToken);
      saveProfile({ displayName: facilitator, avatarId });
      await navigate({ to: "/r/$roomId", params: { roomId: created.roomId } });
    } catch {
      setFailure("Não foi possível criar a sala. Tente novamente.");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-bold">Pokerfé</h1>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <div>
          <label htmlFor="room-name" className="mb-1 block font-medium">
            Nome da sala
          </label>
          <input
            id="room-name"
            className={inputClass}
            value={roomName}
            maxLength={ROOM_NAME_MAX}
            onChange={(e) => setRoomName(e.target.value)}
            aria-invalid={errors.room ? true : undefined}
            aria-describedby={errors.room ? "room-name-error" : undefined}
          />
          {errors.room && (
            <p id="room-name-error" role="alert" className="mt-1 text-red-700">
              {errors.room}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="deck" className="mb-1 block font-medium">
            Baralho
          </label>
          <select
            id="deck"
            className={inputClass}
            value={deckType}
            onChange={(e) => setDeckType(e.target.value as DeckType)}
          >
            {DECK_TYPES.map((type) => (
              <option key={type} value={type}>
                {DECK_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="display-name" className="mb-1 block font-medium">
            Seu nome
          </label>
          <input
            id="display-name"
            className={inputClass}
            value={displayName}
            maxLength={DISPLAY_NAME_MAX}
            onChange={(e) => setDisplayName(e.target.value)}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "display-name-error" : undefined}
          />
          {errors.name && (
            <p
              id="display-name-error"
              role="alert"
              className="mt-1 text-red-700"
            >
              {errors.name}
            </p>
          )}
        </div>
        <div>
          <span className="mb-1 block font-medium">Avatar (opcional)</span>
          <AvatarPicker
            value={avatarId}
            onChange={setAvatarId}
            displayName={displayName}
          />
        </div>
        {failure && (
          <p role="alert" className="text-red-700">
            {failure}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          Criar sala
        </button>
      </form>
    </main>
  );
}
