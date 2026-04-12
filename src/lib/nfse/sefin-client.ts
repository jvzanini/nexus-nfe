import https from "node:https";
import { NFSE_ENDPOINTS, NFSE_ROTAS } from "./constants";
import { createMtlsAgent } from "./mtls-client";
import { parseSubmitResponse, parseErrorResponse, type SubmitResponse } from "./response-parser";

export interface SefinClientConfig {
  ambiente: "homologacao" | "producao";
  privateKeyPem: string;
  certPem: string;
}

export class SefinClient {
  private baseUrl: string;
  private agent: https.Agent;

  constructor(config: SefinClientConfig) {
    const endpoints = config.ambiente === "producao"
      ? NFSE_ENDPOINTS.producao
      : NFSE_ENDPOINTS.homologacao;
    this.baseUrl = endpoints.sefinBase;
    this.agent = createMtlsAgent(config.privateKeyPem, config.certPem);
  }

  async submitNfse(dpsXmlGZipB64: string): Promise<SubmitResponse> {
    const url = `${this.baseUrl}${NFSE_ROTAS.emissao}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dpsXmlGZipB64 }),
      // @ts-expect-error — Node fetch aceita dispatcher
      dispatcher: this.agent,
      signal: AbortSignal.timeout(30_000),
    });
    const json = (await response.json()) as Record<string, unknown>;
    if (response.ok) return parseSubmitResponse(json);
    return parseErrorResponse(json);
  }

  async getNfse(chaveAcesso: string): Promise<Record<string, unknown> | null> {
    const url = `${this.baseUrl}${NFSE_ROTAS.consultarNfsePorChave(chaveAcesso)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      // @ts-expect-error
      dispatcher: this.agent,
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown>;
  }

  async headDps(idDps: string): Promise<boolean> {
    const url = `${this.baseUrl}${NFSE_ROTAS.reconciliarDps(idDps)}`;
    const response = await fetch(url, {
      method: "HEAD",
      // @ts-expect-error
      dispatcher: this.agent,
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok;
  }
}
