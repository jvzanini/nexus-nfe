import { describe, it, expect } from "vitest";
import { packDps, unpackDps } from "../pack";

describe("pack / unpack", () => {
  it("comprime e codifica em base64 válido", () => {
    const xml = '<?xml version="1.0"?><DPS><teste>valor</teste></DPS>';
    const packed = packDps(xml);
    expect(packed).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
  });

  it("round-trip: pack + unpack recupera o XML original", () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?><DPS xmlns="http://www.sped.fazenda.gov.br/nfse"><infDPS Id="DPS123">teste de round-trip com acentos ção</infDPS></DPS>';
    const packed = packDps(xml);
    const unpacked = unpackDps(packed);
    expect(unpacked).toBe(xml);
  });

  it("preserva unicode e caracteres especiais", () => {
    const xml = "<root>âéîõü &amp; &lt; &gt; 中文</root>";
    const unpacked = unpackDps(packDps(xml));
    expect(unpacked).toBe(xml);
  });

  it("comprime efetivamente em payloads grandes", () => {
    const xml = "<root>" + "a".repeat(10000) + "</root>";
    const packed = packDps(xml);
    // Base64 (gzipped de 10k "a"s) deve ser muito menor que o original em base64
    expect(packed.length).toBeLessThan(xml.length / 2);
  });
});
