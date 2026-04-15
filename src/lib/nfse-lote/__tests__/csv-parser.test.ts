import { describe, it, expect } from "vitest";
import {
  parseValorBr,
  parseDataBr,
  detectSeparator,
  parseCsvLine,
  normalizeHeader,
  splitCsvLines,
  isValidCpf,
  isValidCnpj,
} from "../csv-parser";

describe("parseValorBr", () => {
  it("parse inteiros", () => {
    expect(parseValorBr("100")).toBe(100);
  });
  it("parse BR com virgula", () => {
    expect(parseValorBr("100,50")).toBe(100.5);
  });
  it("parse EN com ponto", () => {
    expect(parseValorBr("100.50")).toBe(100.5);
  });
  it("parse BR com milhar", () => {
    expect(parseValorBr("1.234,56")).toBe(1234.56);
  });
  it("parse EN com milhar", () => {
    expect(parseValorBr("1,234.56")).toBe(1234.56);
  });
  it("retorna null para vazio", () => {
    expect(parseValorBr("")).toBeNull();
    expect(parseValorBr("   ")).toBeNull();
  });
  it("retorna null para lixo", () => {
    expect(parseValorBr("abc")).toBeNull();
  });
});

describe("parseDataBr", () => {
  it("parse DD/MM/YYYY", () => {
    const d = parseDataBr("15/04/2026");
    expect(d?.toISOString()).toBe("2026-04-15T00:00:00.000Z");
  });
  it("parse ISO YYYY-MM-DD", () => {
    const d = parseDataBr("2026-04-15");
    expect(d?.toISOString()).toBe("2026-04-15T00:00:00.000Z");
  });
  it("rejeita data inválida", () => {
    expect(parseDataBr("32/13/2026")).toBeNull();
    expect(parseDataBr("abc")).toBeNull();
    expect(parseDataBr("")).toBeNull();
  });
});

describe("detectSeparator", () => {
  it("detecta ponto-e-virgula", () => {
    expect(detectSeparator("a;b;c")).toBe(";");
  });
  it("detecta virgula", () => {
    expect(detectSeparator("a,b,c")).toBe(",");
  });
  it("prefere ; em empate", () => {
    expect(detectSeparator("a;b,c")).toBe(";");
  });
});

describe("parseCsvLine", () => {
  it("linha simples", () => {
    expect(parseCsvLine("a;b;c", ";")).toEqual(["a", "b", "c"]);
  });
  it("aspas dentro", () => {
    expect(parseCsvLine('"João, S.A.";100;teste', ";")).toEqual([
      "João, S.A.",
      "100",
      "teste",
    ]);
  });
});

describe("normalizeHeader", () => {
  it("normaliza acentos", () => {
    expect(normalizeHeader("Valor Serviço")).toBe("valor_servico");
  });
});

describe("splitCsvLines", () => {
  it("remove BOM e linhas vazias", () => {
    const txt = "\uFEFFa\n\nb\r\nc\n";
    expect(splitCsvLines(txt)).toEqual(["a", "b", "c"]);
  });
});

describe("isValidCpf / isValidCnpj", () => {
  it("valida CPF correto", () => {
    expect(isValidCpf("11144477735")).toBe(true);
  });
  it("rejeita CPF com dígitos iguais", () => {
    expect(isValidCpf("11111111111")).toBe(false);
  });
  it("valida CNPJ correto", () => {
    expect(isValidCnpj("11222333000181")).toBe(true);
  });
  it("rejeita CNPJ errado", () => {
    expect(isValidCnpj("11222333000100")).toBe(false);
  });
});
