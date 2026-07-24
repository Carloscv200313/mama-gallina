import "server-only";

import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const PIN_PATTERN = /^\d{4,6}$/;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;

function deriveKey(secret: string, salt: string, keyLength: number, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    nodeScrypt(secret, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export function isValidPin(pin: string) {
  return PIN_PATTERN.test(pin);
}

export async function hashPin(pin: string) {
  if (!isValidPin(pin)) {
    throw new Error("El PIN debe tener entre 4 y 6 dígitos.");
  }

  const salt = randomBytes(16).toString("hex");
  const derivedKey = await deriveKey(pin, salt, 64, SCRYPT_PARAMS);
  return `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPin(pin: string, storedHash: string) {
  if (!isValidPin(pin)) return false;

  const [algorithm, n, r, p, salt, storedKey] = storedHash.split("$");
  if (algorithm !== "scrypt" || !n || !r || !p || !salt || !storedKey) return false;

  try {
    const derivedKey = await deriveKey(pin, salt, storedKey.length / 2, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    const expectedKey = Buffer.from(storedKey, "hex");
    return derivedKey.length === expectedKey.length && timingSafeEqual(derivedKey, expectedKey);
  } catch {
    return false;
  }
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
