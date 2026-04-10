import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

/**
 * Criptografa um valor em texto plano usando AES-256-GCM.
 * Retorna string no formato `${ivHex}:${authTagHex}:${encryptedHex}`.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Descriptografa um valor previamente criptografado por `encrypt()`.
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const [ivHex, authTagHex, encrypted] = ciphertext.split(":");

  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error("Invalid ciphertext format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Mascara um valor sensivel para exibicao na interface.
 */
export function mask(
  value: string,
  options: { visibleEnd?: number; visibleStart?: number } = {}
): string {
  const { visibleEnd = 5, visibleStart = 0 } = options;
  if (!value || value.length <= visibleEnd + visibleStart) return "••••••••";
  const start = visibleStart > 0 ? value.slice(0, visibleStart) : "";
  const end = visibleEnd > 0 ? value.slice(-visibleEnd) : "";
  return start + "••••••••" + end;
}
