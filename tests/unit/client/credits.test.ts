import { CREDITS } from "@client/credits.ts";
import { AVATAR_IDS } from "@shared/avatars.ts";
import { describe, expect, it } from "vitest";

describe("credits", () => {
  it("há uma atribuição por avatarId, sem sobras nem duplicatas", () => {
    const ids = CREDITS.map((c) => c.avatarId);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...AVATAR_IDS].sort());
  });

  it("está em ordem alfabética pt-BR", () => {
    const names = CREDITS.map((c) => c.avatarName);
    const sorted = [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
    expect(names).toEqual(sorted);
  });

  it("usa o texto do Flaticon como fornecido", () => {
    const giraffe = CREDITS.find((c) => c.avatarId === "giraffe")!;
    expect(giraffe.href).toBe("https://www.flaticon.com/free-icons/africa");
    expect(giraffe.title).toBe("africa icons");
    expect(giraffe.text).toBe("Africa icons created by Magnific - Flaticon");
  });
});
