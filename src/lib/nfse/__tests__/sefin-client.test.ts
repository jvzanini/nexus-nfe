import { describe, it, expect, vi, beforeEach } from "vitest";
import https from "node:https";
import { SefinClient } from "../sefin-client";
import type { SubmitSuccessResponse, SubmitErrorResponse } from "../response-parser";

// Mock https.request
vi.mock("node:https", async () => {
  const actual = await vi.importActual<typeof import("node:https")>("node:https");
  return {
    ...actual,
    default: {
      ...actual.default,
      request: vi.fn(),
      Agent: actual.default.Agent,
    },
  };
});

function mockHttpsResponse(statusCode: number, body: string) {
  const mockReq = {
    on: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
    destroy: vi.fn(),
  };

  (https.request as any).mockImplementation((_opts: any, callback: any) => {
    // Simulate async response
    process.nextTick(() => {
      const res = {
        statusCode,
        on: vi.fn((event: string, handler: any) => {
          if (event === "data") handler(Buffer.from(body));
          if (event === "end") process.nextTick(handler);
        }),
      };
      callback(res);
    });
    return mockReq;
  });

  return mockReq;
}

describe("SefinClient", () => {
  const client = new SefinClient({
    ambiente: "homologacao",
    privateKeyPem: "fake-key",
    certPem: "fake-cert",
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("submitNfse", () => {
    it("faz POST e retorna sucesso", async () => {
      mockHttpsResponse(200, JSON.stringify({
        chaveAcesso: "NFSe530010812345678000190000010000000000001",
        numeroNfse: "000000001",
        dataAutorizacao: "2026-04-12T14:30:00-03:00",
      }));

      const result = await client.submitNfse("base64payload");
      expect(result.success).toBe(true);
      expect((result as SubmitSuccessResponse).chaveAcesso).toBeDefined();
    });

    it("retorna erro para 422", async () => {
      mockHttpsResponse(422, JSON.stringify({
        codigo: "422",
        mensagem: "DPS duplicada",
      }));

      const result = await client.submitNfse("base64payload");
      expect(result.success).toBe(false);
      expect((result as SubmitErrorResponse).codigo).toBe("422");
    });
  });

  describe("headDps", () => {
    it("retorna true para 200", async () => {
      mockHttpsResponse(200, "");
      const result = await client.headDps("DPS530010811234567800019000001000000000000001");
      expect(result).toBe(true);
    });

    it("retorna false para 404", async () => {
      mockHttpsResponse(404, "");
      const result = await client.headDps("DPS530010811234567800019000001000000000000001");
      expect(result).toBe(false);
    });
  });

  describe("getNfse", () => {
    it("retorna dados para chave válida", async () => {
      mockHttpsResponse(200, JSON.stringify({ chaveAcesso: "abc", status: "autorizada" }));
      const result = await client.getNfse("abc");
      expect(result).not.toBeNull();
    });

    it("retorna null para 404", async () => {
      mockHttpsResponse(404, "not found");
      const result = await client.getNfse("invalid");
      expect(result).toBeNull();
    });
  });
});
