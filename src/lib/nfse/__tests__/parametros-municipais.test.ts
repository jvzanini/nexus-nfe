import { describe, it, expect } from "vitest";
import {
  getConvenioMunicipal,
  getParametrosServico,
} from "../parametros-municipais";

describe("parametros-municipais (mock)", () => {
  it("getConvenioMunicipal retorna dados para Brasília (5300108)", async () => {
    const result = await getConvenioMunicipal("5300108");
    expect(result).not.toBeNull();
    expect(result!.codigoMunicipio).toBe("5300108");
    expect(result!.aderiu).toBe(true);
  });

  it("getConvenioMunicipal retorna null para município inexistente", async () => {
    const result = await getConvenioMunicipal("0000000");
    expect(result).toBeNull();
  });

  it("getParametrosServico retorna alíquota para serviço válido em Brasília", async () => {
    const result = await getParametrosServico("5300108", "010101");
    expect(result).not.toBeNull();
    expect(typeof result!.aliquota).toBe("number");
    expect(result!.aliquota).toBeGreaterThan(0);
  });

  it("getParametrosServico retorna alíquota TI (2%) para códigos começando com 01", async () => {
    const result = await getParametrosServico("5300108", "010101");
    expect(result!.aliquota).toBe(2.0);
  });

  it("getParametrosServico retorna alíquota padrão (5%) para outros serviços", async () => {
    const result = await getParametrosServico("5300108", "070101");
    expect(result!.aliquota).toBe(5.0);
  });

  it("getParametrosServico retorna null para serviço inexistente", async () => {
    const result = await getParametrosServico("5300108", "invalid");
    expect(result).toBeNull();
  });

  it("getParametrosServico retorna null para município inexistente", async () => {
    const result = await getParametrosServico("0000000", "010101");
    expect(result).toBeNull();
  });
});
