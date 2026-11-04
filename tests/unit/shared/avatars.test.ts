import { describe, expect, it } from "vitest";
import {
  AVATAR_IDS,
  AVATARS,
  avatarName,
  isAvatarId,
  nameInitial,
} from "@shared/avatars.ts";
import { generateId } from "@shared/ids.ts";
import { joinMessageSchema } from "@shared/protocol.ts";

const files = Object.keys(
  import.meta.glob("../../../src/client/assets/avatars/*.png"),
).map((path) =>
  path
    .split("/")
    .pop()!
    .replace(/\.png$/, ""),
);

describe("catálogo de avatares", () => {
  it("exporta exatamente os 12 animais aprovados", () => {
    expect([...AVATAR_IDS].sort()).toEqual(
      [
        "eagle",
        "elephant",
        "fox",
        "giraffe",
        "gorilla",
        "horse",
        "lion",
        "meerkat",
        "panda",
        "penguin",
        "snake",
        "tiger",
      ].sort(),
    );
  });

  it("tem um PNG para cada avatarId e nenhum arquivo sobrando", () => {
    for (const id of AVATAR_IDS) {
      expect(files, id).toContain(id);
    }
    expect([...files].sort()).toEqual([...AVATAR_IDS].sort());
  });

  it("lista os nomes em ordem alfabética pt-BR, sem repetição", () => {
    const names = AVATARS.map((a) => a.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
    expect(names).toEqual(sorted);
    expect(new Set(names).size).toBe(names.length);
    expect(avatarName("fox")).toBe("Raposa");
  });

  it("isAvatarId reconhece só IDs da lista", () => {
    expect(isAvatarId("lion")).toBe(true);
    expect(isAvatarId("dragon")).toBe(false);
    expect(isAvatarId(null)).toBe(false);
  });

  it("o schema de join aceita avatar da lista ou null e rejeita outros", () => {
    const base = {
      type: "join",
      sessionId: generateId(),
      displayName: "Ana",
    };
    expect(
      joinMessageSchema.safeParse({ ...base, avatarId: "lion" }).success,
    ).toBe(true);
    expect(
      joinMessageSchema.safeParse({ ...base, avatarId: null }).success,
    ).toBe(true);
    expect(
      joinMessageSchema.safeParse({ ...base, avatarId: "dragon" }).success,
    ).toBe(false);
  });
});

describe("placeholder do avatar", () => {
  it('usa a primeira letra do nome em maiúscula: "Ana" → "A"', () => {
    expect(nameInitial("Ana")).toBe("A");
    expect(nameInitial("  ana")).toBe("A");
    expect(nameInitial("émile")).toBe("É");
    expect(nameInitial("😀 Bob")).toBe("😀");
    expect(nameInitial("")).toBe("");
  });
});
