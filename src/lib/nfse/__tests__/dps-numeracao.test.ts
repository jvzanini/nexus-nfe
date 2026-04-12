import { describe, it, expect } from "vitest";
import { buildIdDps } from "../dps-id";

describe("numeração DPS — buildIdDps com série e número sequencial", () => {
  it("gera idDps válido com número 1 e série 00001", () => {
    const id = buildIdDps({
      codigoLocalEmissao: "5300108",
      tipoInscricao: 1,
      inscricaoFederal: "12345678000195",
      serie: "00001",
      numero: "1",
    });
    expect(id).toHaveLength(45);
    expect(id).toMatch(/^DPS/);
    expect(id.slice(-15)).toBe("000000000000001");
    expect(id.slice(-20, -15)).toBe("00001");
  });

  it("gera idDps válido com número alto (999)", () => {
    const id = buildIdDps({
      codigoLocalEmissao: "5300108",
      tipoInscricao: 1,
      inscricaoFederal: "12345678000195",
      serie: "00001",
      numero: "999",
    });
    expect(id).toHaveLength(45);
    expect(id.slice(-15)).toBe("000000000000999");
  });

  it("números diferentes geram idDps diferentes", () => {
    const base = {
      codigoLocalEmissao: "5300108",
      tipoInscricao: 1 as const,
      inscricaoFederal: "12345678000195",
      serie: "00001",
    };
    const id1 = buildIdDps({ ...base, numero: "1" });
    const id2 = buildIdDps({ ...base, numero: "2" });
    expect(id1).not.toBe(id2);
  });
});
