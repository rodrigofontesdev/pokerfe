const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const ID_LENGTH = 22;
const ID_PATTERN = /^[0-9A-Za-z]{22}$/;

// 62^22 > 2^128, então 22 caracteres base62 cobrem os 128 bits.
export function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);

  let id = "";
  for (let i = 0; i < ID_LENGTH; i++) {
    id = ALPHABET[Number(value % 62n)] + id;
    value /= 62n;
  }
  return id;
}

export function isValidId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}
