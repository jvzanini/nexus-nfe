import { describe, it, expect, beforeAll } from "vitest";
import {
  gerarSecret,
  verificarTotp,
  gerarTotpAgora,
  gerarBackupCodes,
  empacotarBackupHashes,
  consumirBackupCode,
} from "../totp";

beforeAll(() => {
  // ENCRYPTION_KEY de teste (32 bytes em hex)
  if (!process.env.ENCRYPTION_KEY) {
    process.env.ENCRYPTION_KEY = "a".repeat(64);
  }
});

describe("TOTP", () => {
  it("gerarSecret retorna string base32", () => {
    const s = gerarSecret();
    expect(s.length).toBeGreaterThan(10);
  });

  it("verificarTotp aceita token válido", () => {
    const s = gerarSecret();
    const token = gerarTotpAgora(s);
    expect(verificarTotp(token, s)).toBe(true);
  });

  it("verificarTotp rejeita token inválido", () => {
    const s = gerarSecret();
    expect(verificarTotp("000000", s)).toBe(false);
  });
});

describe("Backup codes", () => {
  it("gera 10 únicos", () => {
    const codes = gerarBackupCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
  });

  it("consome código válido uma única vez", () => {
    const codes = gerarBackupCodes();
    const envelope = empacotarBackupHashes(codes);
    const novo = consumirBackupCode(envelope, codes[0]);
    expect(novo).not.toBeNull();
    // segunda vez falha
    const segunda = consumirBackupCode(novo!, codes[0]);
    expect(segunda).toBeNull();
  });

  it("rejeita código desconhecido", () => {
    const codes = gerarBackupCodes();
    const envelope = empacotarBackupHashes(codes);
    expect(consumirBackupCode(envelope, "FFFFFFFF")).toBeNull();
  });
});
