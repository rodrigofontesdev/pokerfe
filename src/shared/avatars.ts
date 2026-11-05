export const AVATARS = [
  { id: "eagle", name: "Águia" },
  { id: "horse", name: "Cavalo" },
  { id: "snake", name: "Cobra" },
  { id: "elephant", name: "Elefante" },
  { id: "giraffe", name: "Girafa" },
  { id: "gorilla", name: "Gorila" },
  { id: "lion", name: "Leão" },
  { id: "panda", name: "Panda" },
  { id: "penguin", name: "Pinguim" },
  { id: "fox", name: "Raposa" },
  { id: "meerkat", name: "Suricato" },
  { id: "tiger", name: "Tigre" },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];

export const AVATAR_IDS = AVATARS.map((a) => a.id) as [AvatarId, ...AvatarId[]];

export function isAvatarId(value: unknown): value is AvatarId {
  return AVATAR_IDS.some((id) => id === value);
}

export function avatarName(id: AvatarId): string {
  return AVATARS.find((a) => a.id === id)!.name;
}

export function nameInitial(displayName: string): string {
  const first = Array.from(displayName.trim())[0];
  return first ? first.toLocaleUpperCase("pt-BR") : "";
}
