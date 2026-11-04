import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getFacilitatorToken,
  getProfile,
  getSessionId,
  resetMemoryForTests,
  saveFacilitatorToken,
  saveProfile,
} from "@client/storage/local.ts";

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

beforeEach(() => resetMemoryForTests());
afterEach(() => vi.unstubAllGlobals());

describe("storage local", () => {
  it("gera sessionId base62 de 22 caracteres e o reutiliza", () => {
    vi.stubGlobal("localStorage", fakeStorage());
    const first = getSessionId();
    expect(first).toMatch(/^[0-9A-Za-z]{22}$/);
    resetMemoryForTests();
    expect(getSessionId()).toBe(first);
  });

  it("regenera sessionId inválido", () => {
    const storage = fakeStorage();
    storage.setItem("pokerfe:sessionId", "curto");
    vi.stubGlobal("localStorage", storage);
    expect(getSessionId()).toMatch(/^[0-9A-Za-z]{22}$/);
  });

  it("persiste perfil e token por sala", () => {
    vi.stubGlobal("localStorage", fakeStorage());
    expect(getProfile()).toBeNull();
    saveProfile({ displayName: "Ana", avatarId: "raposa" });
    expect(getProfile()).toEqual({ displayName: "Ana", avatarId: "raposa" });
    saveFacilitatorToken("sala1", "tok");
    expect(getFacilitatorToken("sala1")).toBe("tok");
    expect(getFacilitatorToken("sala2")).toBeNull();
  });

  it("ignora perfil corrompido", () => {
    const storage = fakeStorage();
    storage.setItem("pokerfe:profile", "{nao-json");
    vi.stubGlobal("localStorage", storage);
    expect(getProfile()).toBeNull();
  });

  it("continua funcionando quando o localStorage lança", () => {
    const boom = () => {
      throw new Error("bloqueado");
    };
    vi.stubGlobal("localStorage", { getItem: boom, setItem: boom });
    const id = getSessionId();
    expect(id).toMatch(/^[0-9A-Za-z]{22}$/);
    expect(getSessionId()).toBe(id);
    expect(getProfile()).toBeNull();
    expect(() =>
      saveProfile({ displayName: "A", avatarId: null }),
    ).not.toThrow();
    expect(getFacilitatorToken("x")).toBeNull();
    expect(() => saveFacilitatorToken("x", "t")).not.toThrow();
  });

  it("continua funcionando quando o localStorage não existe", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(getSessionId()).toMatch(/^[0-9A-Za-z]{22}$/);
  });
});
