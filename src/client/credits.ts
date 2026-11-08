import { AVATARS, type AvatarId } from "@shared/avatars.ts";

export interface Credit {
  avatarId: AvatarId;
  avatarName: string;
  href: string;
  title: string;
  text: string;
}

// Termo do Flaticon por avatar, exatamente como fornecido pelo responsável
// pelo produto (a girafa usa "africa").
const FLATICON_TERMS: Record<AvatarId, string> = {
  eagle: "eagle",
  horse: "horse",
  snake: "snake",
  elephant: "elephant",
  giraffe: "africa",
  gorilla: "gorilla",
  lion: "lion",
  panda: "panda",
  penguin: "penguin",
  fox: "fox",
  meerkat: "meerkat",
  tiger: "tiger",
};

function capitalize(term: string): string {
  return term.charAt(0).toUpperCase() + term.slice(1);
}

export const CREDITS: readonly Credit[] = AVATARS.map((avatar) => {
  const term = FLATICON_TERMS[avatar.id];
  return {
    avatarId: avatar.id,
    avatarName: avatar.name,
    href: `https://www.flaticon.com/free-icons/${term}`,
    title: `${term} icons`,
    text: `${capitalize(term)} icons created by Magnific - Flaticon`,
  };
}).sort((a, b) => a.avatarName.localeCompare(b.avatarName, "pt-BR"));
