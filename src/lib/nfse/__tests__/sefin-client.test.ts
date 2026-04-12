import { describe, it, expect, vi, beforeEach } from "vitest";
import { SefinClient } from "../sefin-client";
import type { SubmitSuccessResponse, SubmitErrorResponse } from "../response-parser";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("SefinClient", () => {
  const client = new SefinClient({
    ambiente: "homologacao",
    privateKeyPem: "fake-key",
    certPem: "fake-cert",
  });

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("submitNfse", () => {
    it("faz POST com body correto e retorna sucesso", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          chaveAcesso: "NFSe530010812345678000190000010000000000001",
          numeroNfse: "000000001",
          dataAutorizacao: "2026-04-12T14:30:00-03:00",
        }),
      });
      const result = await client.submitNfse("base64payload");
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain("/nfse");
      expect(opts.method).toBe("POST");
      expect(JSON.parse(opts.body)).toEqual({ dpsXmlGZipB64: "base64payload" });
      expect(result.success).toBe(true);
      expect((result as SubmitSuccessResponse).chaveAcesso).toBeDefined();
    });

    it("retorna erro para resposta 422", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ codigo: "422", mensagem: "DPS duplicada" }),
      });
      const result = await client.submitNfse("base64payload");
      expect(result.success).toBe(false);
      expect((result as SubmitErrorResponse).codigo).toBe("422");
    });
  });

  describe("headDps", () => {
    it("retorna true para 200", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      const result = await client.headDps("DPS530010811234567800019000001000000000000001");
      expect(result).toBe(true);
    });

    it("retorna false para 404", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
      const result = await client.headDps("DPS530010811234567800019000001000000000000001");
      expect(result).toBe(false);
    });
  });

  describe("getNfse", () => {
    it("retorna dados para chave válida", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ chaveAcesso: "abc", status: "autorizada" }),
      });
      const result = await client.getNfse("abc");
      expect(result).not.toBeNull();
      expect(result!.chaveAcesso).toBe("abc");
    });

    it("retorna null para 404", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
      const result = await client.getNfse("invalid");
      expect(result).toBeNull();
    });
  });
});
