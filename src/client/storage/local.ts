import { generateId, isValidId } from "@shared/ids.ts";

const SESSION_KEY = "pokerfe:sessionId";
const PROFILE_KEY = "pokerfe:profile";
const TOKEN_PREFIX = "pokerfe:facilitatorToken:";

export type Profile = {
  displayName: string;
  avatarId: string | null;
};

// Usado quando o localStorage não está disponível, para o sessionId
// continuar estável enquanto a página estiver aberta.
let memorySessionId: string | null = null;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function getSessionId(): string {
  const stored = read(SESSION_KEY);
  if (isValidId(stored)) {
    memorySessionId = stored;
    return stored;
  }
  if (memorySessionId === null) memorySessionId = generateId();
  write(SESSION_KEY, memorySessionId);
  return memorySessionId;
}

export function getProfile(): Profile | null {
  const raw = read(PROFILE_KEY);
  if (raw === null) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return null;
    const { displayName, avatarId } = data as Record<string, unknown>;
    if (typeof displayName !== "string") return null;
    if (avatarId !== null && typeof avatarId !== "string") return null;
    return { displayName, avatarId };
  } catch {
    return null;
  }
}

export function saveProfile(profile: Profile): void {
  write(PROFILE_KEY, JSON.stringify(profile));
}

export function getFacilitatorToken(roomId: string): string | null {
  return read(TOKEN_PREFIX + roomId);
}

export function saveFacilitatorToken(roomId: string, token: string): void {
  write(TOKEN_PREFIX + roomId, token);
}

// Apenas para testes.
export function resetMemoryForTests(): void {
  memorySessionId = null;
}
