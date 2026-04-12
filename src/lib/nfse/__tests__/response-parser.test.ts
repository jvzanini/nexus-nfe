import { describe, it, expect } from "vitest";
import { parseSubmitResponse, parseErrorResponse, type SubmitSuccessResponse } from "../response-parser";

describe("parseSubmitResponse", () => {
  it("parseia resposta de sucesso", () => {
    const raw = {
      chaveAcesso: "NFSe53001081234567800019000001000000000000000001",
      numeroNfse: "000000001",
      dataAutorizacao: "2026-04-12T14:30:00-03:00",
      xmlAutorizado: "PD94bWw...",
    };
    const result = parseSubmitResponse(raw);
    expect(result.success).toBe(true);
    expect((result as SubmitSuccessResponse).chaveAcesso).toBe(raw.chaveAcesso);
    expect((result as SubmitSuccessResponse).numeroNfse).toBe(raw.numeroNfse);
    expect((result as SubmitSuccessResponse).xmlAutorizado).toBe(raw.xmlAutorizado);
  });

  it("retorna erro quando falta chaveAcesso", () => {
    const result = parseSubmitResponse({ numeroNfse: "001" });
    expect(result.success).toBe(false);
  });

  it("retorna erro quando falta numeroNfse", () => {
    const result = parseSubmitResponse({ chaveAcesso: "abc" });
    expect(result.success).toBe(false);
  });

  it("sucesso sem xmlAutorizado (opcional)", () => {
    const result = parseSubmitResponse({
      chaveAcesso: "NFSe123",
      numeroNfse: "001",
    });
    expect(result.success).toBe(true);
    expect((result as SubmitSuccessResponse).xmlAutorizado).toBeUndefined();
  });
});

describe("parseErrorResponse", () => {
  it("parseia erro com código e mensagem", () => {
    const result = parseErrorResponse({ codigo: "422", mensagem: "DPS duplicada" });
    expect(result.success).toBe(false);
    expect(result.codigo).toBe("422");
    expect(result.mensagem).toBe("DPS duplicada");
  });

  it("retorna UNKNOWN para resposta sem código", () => {
    const result = parseErrorResponse({});
    expect(result.codigo).toBe("UNKNOWN");
    expect(result.mensagem).toContain("desconhecido");
  });

  it("converte código numérico para string", () => {
    const result = parseErrorResponse({ codigo: 500, mensagem: "Erro interno" });
    expect(result.codigo).toBe("500");
  });
});
