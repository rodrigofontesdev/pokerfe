// Catálogo de avatares (FR-005, research R-13). `id` é o nome do arquivo PNG em
// `src/client/assets/avatars/` sem extensão. Ordem alfabética do nome em pt-BR.
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

// Placeholder quando não há avatar: primeira letra do nome, em maiúscula.
export function nameInitial(displayName: string): string {
  const first = Array.from(displayName.trim())[0];
  return first ? first.toLocaleUpperCase("pt-BR") : "";
}
