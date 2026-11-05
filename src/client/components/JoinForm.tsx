import { useState, type FormEvent } from "react";
import { isAvatarId, type AvatarId } from "@shared/avatars.ts";
import { DISPLAY_NAME_MAX } from "@shared/limits.ts";
import { AvatarPicker } from "@client/components/AvatarPicker.tsx";
import { getProfile, type Profile } from "@client/storage/local.ts";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-blue-600";

type JoinFormProps = {
  roomName?: string;
  serverError?: string | null;
  onJoin: (profile: Profile) => void;
};

export function JoinForm({ roomName, serverError, onJoin }: JoinFormProps) {
  const [initial] = useState(() => getProfile());
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [avatarId, setAvatarId] = useState<AvatarId | null>(
    isAvatarId(initial?.avatarId) ? initial.avatarId : null,
  );
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const name = displayName.trim();
    if (!name) {
      setError("Informe seu nome");
      return;
    }
    setError(null);
    onJoin({ displayName: name, avatarId });
  }

  const message = error ?? serverError ?? null;

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-2xl font-bold">Entrar na sala</h1>
      {roomName && <p className="mt-1 text-slate-600">{roomName}</p>}
      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
        <div>
          <label htmlFor="join-name" className="mb-1 block font-medium">
            Seu nome
          </label>
          <input
            id="join-name"
            className={inputClass}
            value={displayName}
            maxLength={DISPLAY_NAME_MAX}
            onChange={(e) => setDisplayName(e.target.value)}
            aria-invalid={message ? true : undefined}
          />
          {message && (
            <p role="alert" className="mt-1 text-sm text-red-700">
              {message}
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
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
