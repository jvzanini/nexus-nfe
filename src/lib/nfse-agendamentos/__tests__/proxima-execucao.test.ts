import { describe, it, expect } from "vitest";
import {
  calcularProximaExecucao,
  deveEncerrar,
} from "../proxima-execucao";

describe("calcularProximaExecucao", () => {
  it("unica → null", () => {
    expect(
      calcularProximaExecucao(new Date(Date.UTC(2026, 3, 15)), "unica")
    ).toBeNull();
  });

  it("mensal simples", () => {
    const d = calcularProximaExecucao(new Date(Date.UTC(2026, 3, 15)), "mensal");
    expect(d?.toISOString()).toBe("2026-05-15T00:00:00.000Z");
  });

  it("mensal 31/01 → 28/02 em ano não bissexto", () => {
    const d = calcularProximaExecucao(new Date(Date.UTC(2026, 0, 31)), "mensal");
    expect(d?.toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });

  it("mensal 31/01 → 29/02 em ano bissexto", () => {
    const d = calcularProximaExecucao(new Date(Date.UTC(2024, 0, 31)), "mensal");
    expect(d?.toISOString()).toBe("2024-02-29T00:00:00.000Z");
  });

  it("bimestral 15/03 → 15/05", () => {
    const d = calcularProximaExecucao(
      new Date(Date.UTC(2026, 2, 15)),
      "bimestral"
    );
    expect(d?.toISOString()).toBe("2026-05-15T00:00:00.000Z");
  });

  it("anual 15/04/2026 → 15/04/2027", () => {
    const d = calcularProximaExecucao(
      new Date(Date.UTC(2026, 3, 15)),
      "anual"
    );
    expect(d?.toISOString()).toBe("2027-04-15T00:00:00.000Z");
  });

  it("diaMes override fixa no dia 5", () => {
    const d = calcularProximaExecucao(
      new Date(Date.UTC(2026, 3, 15)),
      "mensal",
      5
    );
    expect(d?.toISOString()).toBe("2026-05-05T00:00:00.000Z");
  });
});

describe("deveEncerrar", () => {
  it("proxima=null encerra", () => {
    expect(deveEncerrar(null, null, 0, null)).toBe(true);
  });
  it("dataFinal passada encerra", () => {
    expect(
      deveEncerrar(
        new Date("2026-06-01"),
        new Date("2026-05-01"),
        0,
        null
      )
    ).toBe(true);
  });
  it("maxExecucoes atingido encerra", () => {
    expect(deveEncerrar(new Date("2026-06-01"), null, 12, 12)).toBe(true);
  });
  it("dentro dos limites não encerra", () => {
    expect(deveEncerrar(new Date("2026-06-01"), null, 5, 12)).toBe(false);
  });
});
