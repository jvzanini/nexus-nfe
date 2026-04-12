import { describe, it, expect, beforeAll } from "vitest";
import { parseNbsSheet, type NbsRecord } from "../nbs-parser";

describe("parseNbsSheet", () => {
  let records: NbsRecord[];

  // Parse uma vez, reutiliza nos testes
  beforeAll(() => {
    records = parseNbsSheet();
  });

  it("retorna array com mais de 100 registros", () => {
    expect(records.length).toBeGreaterThan(100);
  });

  it("cada codigo tem exatamente 6 dígitos", () => {
    for (const r of records) {
      expect(r.codigo).toMatch(/^\d{6}$/);
    }
  });

  it("cada registro tem descricao não vazia", () => {
    for (const r of records) {
      expect(r.descricao.trim().length).toBeGreaterThan(0);
    }
  });

  it("nivel é 1 ou 2", () => {
    for (const r of records) {
      expect([1, 2]).toContain(r.nivel);
    }
  });

  it("headers de item (terminam em '0000') têm parentCodigo null", () => {
    const itemHeaders = records.filter((r) => r.codigo.endsWith("0000"));
    expect(itemHeaders.length).toBeGreaterThan(0);
    for (const r of itemHeaders) {
      expect(r.parentCodigo).toBeNull();
    }
  });

  it("registros emitíveis (nível 2) têm parentCodigo válido presente no resultado", () => {
    const codigos = new Set(records.map((r) => r.codigo));
    const emittiveis = records.filter((r) => r.nivel === 2);
    expect(emittiveis.length).toBeGreaterThan(0);
    for (const r of emittiveis) {
      expect(r.parentCodigo).not.toBeNull();
      expect(codigos.has(r.parentCodigo!)).toBe(true);
    }
  });

  it("aliquotaMin e aliquotaMax são null", () => {
    for (const r of records) {
      expect(r.aliquotaMin).toBeNull();
      expect(r.aliquotaMax).toBeNull();
    }
  });

  it("não há códigos duplicados", () => {
    const codigos = records.map((r) => r.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
  });
});
