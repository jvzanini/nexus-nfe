import { describe, it, expect } from "vitest";
import { buildIdDps, validateIdDps } from "../dps-id";

describe("buildIdDps", () => {
  it("gera id com 45 chars (DPS + 7 + 1 + 14 + 5 + 15)", () => {
    const id = buildIdDps({
      codigoLocalEmissao: "5300108",
      tipoInscricao: 1,
      inscricaoFederal: "12345678000190",
      serie: "00001",
      numero: "000000000000001",
    });
    expect(id).toHaveLength(45);
    expect(id.startsWith("DPS5300108")).toBe(true);
    expect(validateIdDps(id)).toBe(true);
  });

  it("padroniza série e número com zeros à esquerda", () => {
    const id = buildIdDps({
      codigoLocalEmissao: "5300108",
      tipoInscricao: 1,
      inscricaoFederal: "12345678000190",
      serie: "1",
      numero: "42",
    });
    expect(id).toHaveLength(45);
    expect(id.endsWith("00001000000000000042")).toBe(true);
  });

  it("CPF preenche zeros à esquerda até 14 dígitos", () => {
    const id = buildIdDps({
      codigoLocalEmissao: "5300108",
      tipoInscricao: 2,
      inscricaoFederal: "12345678901",
      serie: "00001",
      numero: "000000000000001",
    });
    expect(id).toHaveLength(45);
    // tipoInscricao=2 + CPF com 3 zeros à esquerda
    expect(id).toContain("200012345678901");
  });

  it("rejeita código IBGE com tamanho errado", () => {
    expect(() =>
      buildIdDps({
        codigoLocalEmissao: "123",
        tipoInscricao: 1,
        inscricaoFederal: "12345678000190",
        serie: "00001",
        numero: "000000000000001",
      })
    ).toThrow(/7 dígitos/);
  });

  it("rejeita tipoInscricao fora de 1/2", () => {
    expect(() =>
      buildIdDps({
        codigoLocalEmissao: "5300108",
        tipoInscricao: 3 as 1 | 2,
        inscricaoFederal: "12345678000190",
        serie: "00001",
        numero: "000000000000001",
      })
    ).toThrow();
  });

  it("rejeita série acima de 5 dígitos", () => {
    expect(() =>
      buildIdDps({
        codigoLocalEmissao: "5300108",
        tipoInscricao: 1,
        inscricaoFederal: "12345678000190",
        serie: "123456",
        numero: "000000000000001",
      })
    ).toThrow(/série excede/);
  });

  it("rejeita número acima de 15 dígitos", () => {
    expect(() =>
      buildIdDps({
        codigoLocalEmissao: "5300108",
        tipoInscricao: 1,
        inscricaoFederal: "12345678000190",
        serie: "00001",
        numero: "1".repeat(16),
      })
    ).toThrow(/numero excede/);
  });
});

describe("validateIdDps", () => {
  it("aceita id válido gerado pelo próprio builder", () => {
    const id = buildIdDps({
      codigoLocalEmissao: "5300108",
      tipoInscricao: 1,
      inscricaoFederal: "12345678000190",
      serie: "00001",
      numero: "000000000000001",
    });
    expect(validateIdDps(id)).toBe(true);
  });

  it("rejeita id com prefixo errado", () => {
    const valido = buildIdDps({
      codigoLocalEmissao: "5300108",
      tipoInscricao: 1,
      inscricaoFederal: "12345678000190",
      serie: "00001",
      numero: "000000000000001",
    });
    const invalido = "XYZ" + valido.slice(3);
    expect(validateIdDps(invalido)).toBe(false);
  });

  it("rejeita id com tamanho errado", () => {
    expect(validateIdDps("DPS123")).toBe(false);
  });

  it("rejeita id com tipo de inscrição inválido (3)", () => {
    const valido = buildIdDps({
      codigoLocalEmissao: "5300108",
      tipoInscricao: 1,
      inscricaoFederal: "12345678000190",
      serie: "00001",
      numero: "000000000000001",
    });
    // Troca o char do tipoInscricao (posição 10) de "1" pra "3"
    const invalido = valido.slice(0, 10) + "3" + valido.slice(11);
    expect(validateIdDps(invalido)).toBe(false);
  });
});
