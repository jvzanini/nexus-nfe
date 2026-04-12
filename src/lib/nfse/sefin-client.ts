// Client HTTP tipado para o SEFIN Nacional (gov.br/nfse).
// Usa node:https diretamente para suportar mTLS com certificado A1.

import https from "node:https";
import { NFSE_ENDPOINTS, NFSE_ROTAS } from "./constants";
import { createMtlsAgent } from "./mtls-client";
import {
  parseSubmitResponse,
  parseErrorResponse,
  type SubmitResponse,
} from "./response-parser";

export interface SefinClientConfig {
  ambiente: "homologacao" | "producao";
  privateKeyPem: string;
  certPem: string;
}

/**
 * Faz uma requisição HTTPS com mTLS usando node:https.
 */
function httpsRequest(
  url: string,
  options: https.RequestOptions & { body?: string }
): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);

    const req = https.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method ?? "GET",
        headers: options.headers,
        agent: options.agent,
        timeout: 30_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            data: Buffer.concat(chunks).toString("utf-8"),
          });
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("Request timeout (30s)"));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

export class SefinClient {
  private baseUrl: string;
  private agent: https.Agent;

  constructor(config: SefinClientConfig) {
    const endpoints =
      config.ambiente === "producao"
        ? NFSE_ENDPOINTS.producao
        : NFSE_ENDPOINTS.homologacao;
    this.baseUrl = endpoints.sefinBase;
    this.agent = createMtlsAgent(config.privateKeyPem, config.certPem);
  }

  /**
   * POST /nfse — emissão síncrona de NFS-e.
   */
  async submitNfse(dpsXmlGZipB64: string): Promise<SubmitResponse> {
    const url = `${this.baseUrl}${NFSE_ROTAS.emissao}`;
    const body = JSON.stringify({ dpsXmlGZipB64 });

    const res = await httpsRequest(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body).toString(),
      },
      agent: this.agent,
      body,
    });

    const json = JSON.parse(res.data) as Record<string, unknown>;
    if (res.status >= 200 && res.status < 300) {
      return parseSubmitResponse(json);
    }
    return parseErrorResponse(json);
  }

  /**
   * GET /nfse/{chaveAcesso} — consulta NFS-e por chave de acesso.
   */
  async getNfse(chaveAcesso: string): Promise<Record<string, unknown> | null> {
    const url = `${this.baseUrl}${NFSE_ROTAS.consultarNfsePorChave(chaveAcesso)}`;

    const res = await httpsRequest(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      agent: this.agent,
    });

    if (res.status < 200 || res.status >= 300) return null;
    return JSON.parse(res.data) as Record<string, unknown>;
  }

  /**
   * HEAD /dps/{idDps} — reconciliação. Retorna true se DPS já foi processada.
   */
  async headDps(idDps: string): Promise<boolean> {
    const url = `${this.baseUrl}${NFSE_ROTAS.reconciliarDps(idDps)}`;

    const res = await httpsRequest(url, {
      method: "HEAD",
      agent: this.agent,
    });

    return res.status >= 200 && res.status < 300;
  }
}
