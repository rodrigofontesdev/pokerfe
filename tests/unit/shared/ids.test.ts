import { describe, expect, it } from "vitest";
import { generateId, isValidId } from "@shared/ids.ts";

describe("ids", () => {
  it("gera 1.000 IDs de 22 caracteres base62 e distintos", () => {
    const ids = Array.from({ length: 1000 }, generateId);
    for (const id of ids) expect(id).toMatch(/^[0-9A-Za-z]{22}$/);
    expect(new Set(ids).size).toBe(1000);
  });

  it("valida o formato", () => {
    expect(isValidId(generateId())).toBe(true);
    expect(isValidId("a".repeat(21))).toBe(false);
    expect(isValidId("a".repeat(23))).toBe(false);
    expect(isValidId("a".repeat(21) + "-")).toBe(false);
    expect(isValidId(42)).toBe(false);
  });
});
