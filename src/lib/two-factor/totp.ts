import {
  generateSecret,
  generateSync,
  generateURI,
  verifySync,
} from "otplib";
import { randomBytes, createHash } from "crypto";
import QRCode from "qrcode";
import { encrypt, decrypt } from "@/lib/encryption";

export function gerarSecret(): string {
  return generateSecret({ length: 20 });
}

export function otpauthUri(email: string, secret: string): string {
  return generateURI({
    strategy: "totp",
    issuer: "Nexus NFE",
    accountName: email,
    secret,
  } as any);
}

export async function gerarQrCodeDataUrl(otpauth: string): Promise<string> {
  return QRCode.toDataURL(otpauth, { margin: 1, width: 240 });
}

export function gerarTotpAgora(secret: string): string {
  return generateSync({ strategy: "totp", secret } as any);
}

export function verificarTotp(token: string, secret: string): boolean {
  try {
    const cleaned = token.replace(/\s/g, "");
    const r = verifySync({
      strategy: "totp",
      secret,
      token: cleaned,
      window: 1,
    } as any);
    return !!r && (r as any).valid === true;
  } catch {
    return false;
  }
}

export function gerarBackupCodes(n = 10): string[] {
  return Array.from({ length: n }, () =>
    randomBytes(4).toString("hex").toUpperCase()
  );
}

function hashCode(code: string): string {
  return createHash("sha256").update(code.toUpperCase()).digest("hex");
}

export function empacotarBackupHashes(codes: string[]): string {
  const hashes = codes.map(hashCode);
  return encrypt(JSON.stringify(hashes));
}

export function consumirBackupCode(
  envelope: string,
  codeInput: string
): string | null {
  try {
    const hashes = JSON.parse(decrypt(envelope)) as string[];
    const alvo = hashCode(codeInput);
    const idx = hashes.indexOf(alvo);
    if (idx === -1) return null;
    hashes.splice(idx, 1);
    return encrypt(JSON.stringify(hashes));
  } catch {
    return null;
  }
}

export function envelopeSecret(secret: string): string {
  return encrypt(secret);
}

export function desempacotarSecret(envelope: string): string {
  return decrypt(envelope);
}
