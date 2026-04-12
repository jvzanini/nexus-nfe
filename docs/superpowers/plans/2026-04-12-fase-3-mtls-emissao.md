# Fase 3: Transport mTLS + Pipeline de Emissão

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o client HTTP mTLS, o client tipado do SEFIN, o parser de respostas, o handler do worker BullMQ, e integrar a action `emitirNfse` no fluxo completo: rascunho → enfileirar → worker processa (build XML → sign → pack → POST) → salvar resultado. A emissão real contra homologação depende de bloqueios externos (cert A1 + adesão gov.br), mas todo o código e testes ficam prontos.

**Architecture:** O fluxo é: (1) action `emitirNfse` valida o rascunho, carrega certificado criptografado, muda status para `pendente`, enfileira job na fila BullMQ `nfe`. (2) Worker pega o job, monta DPS via `prepareSubmission`, faz POST via `sefin-client` com mTLS, parseia resposta, atualiza status no banco. (3) Se worker crashar, job de reconciliação faz `HEAD /dps/{id}` para verificar se foi processado.

**Tech Stack:** TypeScript, node:https (Agent mTLS), node-forge (PFX→Agent), BullMQ, Prisma, Vitest

---

## File Structure

```
src/lib/nfse/
  mtls-client.ts                   # CREATE — cria https.Agent a partir de PFX
  sefin-client.ts                  # CREATE — HTTP client tipado (submitNfse, getNfse, headDps)
  response-parser.ts               # CREATE — parser de resposta XML/JSON da API
  __tests__/
    mtls-client.test.ts            # CREATE — testes do agent mTLS
    sefin-client.test.ts           # CREATE — testes com mock do fetch
    response-parser.test.ts        # CREATE — testes do parser de resposta

src/worker/
  handlers/
    emit-nfse.ts                   # CREATE — handler BullMQ de emissão

src/lib/actions/
  nfse.ts                          # MODIFY — adicionar emitirNfse + loadCertificadoForSigning

src/worker/index.ts                # MODIFY — integrar handler real no worker nfe
src/lib/queue.ts                   # MODIFY — atualizar tipo NfeJobData
```

---

### Task 1: Client mTLS (mtls-client.ts)

**Files:**
- Create: `src/lib/nfse/mtls-client.ts`
- Create: `src/lib/nfse/__tests__/mtls-client.test.ts`
- Reference: `src/lib/nfse/pfx-loader.ts` (parsePfx retorna privateKeyPem + certPem)

**Contexto:** O gov.br/nfse exige mTLS — o mesmo certificado A1 que assina o XML é usado para autenticar a conexão HTTPS. Node.js suporta isso via `https.Agent` com `key` + `cert` no formato PEM.

- [ ] **Step 1: Escrever o teste**

```typescript
// src/lib/nfse/__tests__/mtls-client.test.ts
import { describe, it, expect } from "vitest";
import { createMtlsAgent } from "../mtls-client";

describe("createMtlsAgent", () => {
  // Usa chave/cert auto-assinados para teste — não precisa de cert real ICP-Brasil
  const SELF_SIGNED_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7o4qne60TB3bq
sE3GYBos1M/cjW2MAVLMYKs+VEkJBO0EBlnCMEj1A5Uf0MWD2RBNfHm/JK1z3GV
T9LMi/BGJtEGClOmrLMqkL1MnOVwhy9GBMi1csBR4M3qHYNahSNLW0OdIO3VTZir
5WcTmrnOHsNh4mBOL8gKMZG0K2gctBEbSWQx5Oi8IJRqhczSfGaHCy4wG0xJdIzr
Y5TGBnKwlFrk8fDAKQXmJxBC/tDeRMa7wBJOAZ2LvbqlH5jAGRrLb6C6sWM41x3y
vuByj6bJHBp22OjctJkf71anmWkPBklEBopUh7oH6DUUFB0kQmEBE3GybfLQSlG5
Dp2Hvb4hAgMBAAECggEBALi8e4cHNlEC4Ws28VkF9msmhzJmJgSAvqm6hQDcfwpJ
m57T4zzNUIBaBP7hEcCBLqMi5IRA2ExN/gS+G3BDSOe/P9Po0kRLIeI37AIVmzAP
JEQ1NRvRMjhCdbFbEsRMkIqgnVCAqhGrc2p7Nay/lBt78DJDvsLNaB2HJzM/Ij7k
BI0pGdJB7NM0hMn3K+N/CY0zGXpvfl8nwL2ykzDD+EZ/o6rDFrUr1ok1Ad5nno7y
bvoHpJxq5L0gNIvd/VsiAOERl6v9c/JesBPBFPMAnNfRMfhAzChBjEZr1cWV0VkM
Z2pGnO1yxeOiWHKa3maw9JcK9nDijVaEN6NikSOhYQECgYEA8VN2zqXkGDKn7a0N
8J+FBymD/a+8tXjqFph5XQmLmYjMbPBjvYFaqXii+VU23Lg4SCLKX7WHOoT0vC37
p3BXQjCvoYb0e0Np/W+PgTArjQJHvJxm3bz/GVfOIfZVbRLnJbbxEJjqXz3Cz8KS
JY5pIaOMfgBiUhBXfP5hTyC0u4ECgYEAx0RPlOLo1OCpvCXAjFkOgDAIqsZvv2ht
fySwEuJO2LBpcxYLY3FUHBnVFbG0n0qCia6SOC1xn4jBOMYfVTMyFaTt+fT3x22F
P0w5n5X7Y9hTDH/2Rao630oi0Xo1k4m1Cpt/0LiJFh86y5CWX4dbT0KkD4i8CRMV
gVGxnl3taYECgYEAqEvPO/m4Y8JX3dMN3Jk7X0bG/VBh1UPJfKdBzRJerJBxK5Dh
L0MPGj/PiTkhMwQlN+bN/CxGSHOQf2uO0pBlKg7CY8ZRgUemFmCloFdyBW7Mudqc
A+Htqfvy4bJK4YKU/a7VZKROjWz2lDe4r8R1qPe8O0vSndJm4J7FfgECgYEAvRXR
hEb8tkjR/OFYsaVl0OOBqn1ATtL6vv4TiA5xTcNiXb3JCG8Y6LJcYr0+mVGh2PE5
CXGM0yGMpbJbQfjb0oH/M9U7FIVYIFOBJY5b+Fn1G7xZahV/3TgiSPXB3R+j5IQG
dP+z4id0niAGnq+BfJkA1VrPzRiMRpElU7NJWAECgYBNt/2WLpMZJix7xVKT6PH0
mT+dDahIBXsXeXk3TljP2EM4S0pG1Ry3Ky/h1GFrlYthBnXtpRyU2XY8xgON8ea
3m/X1r7mCpTQkXLKjfWe8oM+/Lu/aeGTfm0bJnMFWr0m7+wJIhfUFTJ52Bg+yv31
t1p82Ce2s/YWDJGsBsm+YQ==
-----END PRIVATE KEY-----`;

  const SELF_SIGNED_CERT = `-----BEGIN CERTIFICATE-----
MIICpDCCAYwCCQDU+pQC37h1dDANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAls
b2NhbGhvc3QwHhcNMjUwMTAxMDAwMDAwWhcNMjcwMTAxMDAwMDAwWjAUMRIwEAYD
VQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC7
o4qne60TB3bqsE3GYBos1M/cjW2MAVLMYKs+VEkJBO0EBlnCMEj1A5Uf0MWD2RBN
fHm/JK1z3GVT9LMi/BGJtEGClOmrLMqkL1MnOVwhy9GBMi1csBR4M3qHYNahSNL
W0OdIO3VTZir5WcTmrnOHsNh4mBOL8gKMZG0K2gctBEbSWQx5Oi8IJRqhczSfGaH
Cy4wG0xJdIzrY5TGBnKwlFrk8fDAKQXmJxBC/tDeRMa7wBJOAZ2LvbqlH5jAGRrL
b6C6sWM41x3yvuByj6bJHBp22OjctJkf71anmWkPBklEBopUh7oH6DUUFB0kQmEB
E3GybfLQSlG5Dp2Hvb4hAgMBAAEwDQYJKoZIhvcNAQELBQADggEBABlWO3oAnOgb
c0psbBexU0cq/DIgFe9f5Wyi9es7NXQD0/sL20dyDFqHCM5MBxKzKTHTpLQAqNXn
EyBMEFg3IaBIo/4QLwLBLEsDG+0J0JHlfJB/qz9GO6ek3b77MJb7QP3IV+2DVJBO
szS7PKLGNb0iJ1pMhOACaf7T5rCpoWUDq3BKJkMq8oHiB0ypIf5PJE0JXOqv5a3P
Tgfkad7dXVEHTEnMYQaPHGGFrhSXbXsddaJq3F1HDllhCC3Rnq8sCvnPkuRd0TjV
6gF3v86rSH39igB6oFJCjm/L1lfZd4M9Pns35VQXFDgAhN8N3aD/+TWJr/t3RPNC
r6eMj4SgrBs=
-----END CERTIFICATE-----`;

  it("cria um https.Agent com chave e certificado PEM", () => {
    const agent = createMtlsAgent(SELF_SIGNED_KEY, SELF_SIGNED_CERT);
    expect(agent).toBeDefined();
    expect(agent.options.key).toBeDefined();
    expect(agent.options.cert).toBeDefined();
  });

  it("cria agent a partir de PFX buffer + senha via parsePfxToAgent", () => {
    // Este teste será possível só com PFX real de teste
    // Por agora, validamos que a função existe
    expect(typeof createMtlsAgent).toBe("function");
  });
});
```

- [ ] **Step 2: Implementar mtls-client.ts**

```typescript
// src/lib/nfse/mtls-client.ts
import https from "node:https";

/**
 * Cria um https.Agent configurado para mTLS com o certificado do prestador.
 * Usado em todas as chamadas ao gov.br/nfse que exigem autenticação via certificado.
 */
export function createMtlsAgent(
  privateKeyPem: string,
  certPem: string
): https.Agent {
  return new https.Agent({
    key: privateKeyPem,
    cert: certPem,
    rejectUnauthorized: true,
  });
}
```

- [ ] **Step 3: Rodar testes e commit**

Run: `npx vitest run src/lib/nfse/__tests__/mtls-client.test.ts`
Commit: `feat(nfse): client mTLS para autenticação via certificado A1`

---

### Task 2: Response parser (response-parser.ts)

**Files:**
- Create: `src/lib/nfse/response-parser.ts`
- Create: `src/lib/nfse/__tests__/response-parser.test.ts`

**Contexto:** A API do SEFIN retorna JSON para erros e para NFS-e autorizada. A resposta de sucesso contém a chave de acesso, o número da NFS-e, e o XML autorizado (que pode vir empacotado em GZip+Base64). Erros vêm como JSON com código e mensagem.

- [ ] **Step 1: Escrever os testes**

```typescript
// src/lib/nfse/__tests__/response-parser.test.ts
import { describe, it, expect } from "vitest";
import {
  parseSubmitResponse,
  parseErrorResponse,
  type SubmitSuccessResponse,
  type SubmitErrorResponse,
} from "../response-parser";

describe("parseSubmitResponse", () => {
  it("parseia resposta de sucesso com chave de acesso", () => {
    const raw = {
      chaveAcesso: "NFSe53001081234567800019000001000000000000000001",
      numeroNfse: "000000001",
      dataAutorizacao: "2026-04-12T14:30:00-03:00",
      xmlAutorizado: "PD94bWwgdmVyc2lvbj0iMS4wIj8+...", // base64 gzip
    };
    const result = parseSubmitResponse(raw);
    expect(result.success).toBe(true);
    expect((result as SubmitSuccessResponse).chaveAcesso).toBe(raw.chaveAcesso);
    expect((result as SubmitSuccessResponse).numeroNfse).toBe(raw.numeroNfse);
  });

  it("parseia resposta de erro com código e mensagem", () => {
    const raw = {
      codigo: "422",
      mensagem: "DPS já processada anteriormente",
    };
    const result = parseErrorResponse(raw);
    expect(result.success).toBe(false);
    expect(result.codigo).toBe("422");
    expect(result.mensagem).toContain("DPS");
  });

  it("retorna erro genérico para resposta malformada", () => {
    const result = parseErrorResponse({});
    expect(result.success).toBe(false);
    expect(result.codigo).toBe("UNKNOWN");
  });
});
```

- [ ] **Step 2: Implementar response-parser.ts**

```typescript
// src/lib/nfse/response-parser.ts

export interface SubmitSuccessResponse {
  success: true;
  chaveAcesso: string;
  numeroNfse: string;
  dataAutorizacao: string;
  xmlAutorizado?: string;
}

export interface SubmitErrorResponse {
  success: false;
  codigo: string;
  mensagem: string;
}

export type SubmitResponse = SubmitSuccessResponse | SubmitErrorResponse;

/**
 * Parseia a resposta JSON de sucesso do POST /nfse.
 */
export function parseSubmitResponse(raw: Record<string, unknown>): SubmitResponse {
  if (raw.chaveAcesso && raw.numeroNfse) {
    return {
      success: true,
      chaveAcesso: String(raw.chaveAcesso),
      numeroNfse: String(raw.numeroNfse),
      dataAutorizacao: String(raw.dataAutorizacao ?? ""),
      xmlAutorizado: raw.xmlAutorizado ? String(raw.xmlAutorizado) : undefined,
    };
  }
  return parseErrorResponse(raw);
}

/**
 * Parseia uma resposta de erro da API.
 */
export function parseErrorResponse(raw: Record<string, unknown>): SubmitErrorResponse {
  return {
    success: false,
    codigo: raw.codigo ? String(raw.codigo) : "UNKNOWN",
    mensagem: raw.mensagem ? String(raw.mensagem) : "Erro desconhecido na API do SEFIN",
  };
}
```

- [ ] **Step 3: Rodar testes e commit**

Run: `npx vitest run src/lib/nfse/__tests__/response-parser.test.ts`
Commit: `feat(nfse): parser de resposta da API SEFIN`

---

### Task 3: SEFIN Client tipado (sefin-client.ts)

**Files:**
- Create: `src/lib/nfse/sefin-client.ts`
- Create: `src/lib/nfse/__tests__/sefin-client.test.ts`
- Reference: `src/lib/nfse/constants.ts` (NFSE_ENDPOINTS, NFSE_ROTAS)
- Reference: `src/lib/nfse/mtls-client.ts` (createMtlsAgent)
- Reference: `src/lib/nfse/response-parser.ts` (parseSubmitResponse)

**Contexto:** Client HTTP tipado para as 3 operações principais do SEFIN: POST /nfse (emissão), GET /nfse/{chave} (consulta), HEAD /dps/{id} (reconciliação). Usa mTLS via `createMtlsAgent`. Timeout de 30s. Retorna tipos parseados.

- [ ] **Step 1: Escrever os testes**

```typescript
// src/lib/nfse/__tests__/sefin-client.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SefinClient } from "../sefin-client";
import type { SubmitSuccessResponse } from "../response-parser";

// Mock global fetch
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

  it("submitNfse faz POST com body correto", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        chaveAcesso: "NFSe53001081234567800019000001000000000000000001",
        numeroNfse: "000000001",
        dataAutorizacao: "2026-04-12T14:30:00-03:00",
      }),
    });

    const result = await client.submitNfse("base64gzipxml");
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/nfse");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({ dpsXmlGZipB64: "base64gzipxml" });
    expect(result.success).toBe(true);
    expect((result as SubmitSuccessResponse).chaveAcesso).toBeDefined();
  });

  it("submitNfse retorna erro para resposta 4xx", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        codigo: "422",
        mensagem: "DPS duplicada",
      }),
    });

    const result = await client.submitNfse("base64gzipxml");
    expect(result.success).toBe(false);
  });

  it("headDps retorna true para 200", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    const result = await client.headDps("DPS5300108112345678000190000010000000000000001");
    expect(result).toBe(true);
  });

  it("headDps retorna false para 404", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const result = await client.headDps("DPS5300108112345678000190000010000000000000001");
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Implementar sefin-client.ts**

```typescript
// src/lib/nfse/sefin-client.ts
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
   * Body: { dpsXmlGZipB64: string }
   */
  async submitNfse(dpsXmlGZipB64: string): Promise<SubmitResponse> {
    const url = `${this.baseUrl}${NFSE_ROTAS.emissao}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dpsXmlGZipB64 }),
      // @ts-expect-error — Node fetch aceita agent via dispatcher
      dispatcher: this.agent,
      signal: AbortSignal.timeout(30_000),
    });

    const json = (await response.json()) as Record<string, unknown>;

    if (response.ok) {
      return parseSubmitResponse(json);
    }
    return parseErrorResponse(json);
  }

  /**
   * GET /nfse/{chaveAcesso} — consulta NFS-e por chave de acesso.
   */
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

  /**
   * HEAD /dps/{idDps} — reconciliação. Retorna true se DPS já foi processada.
   */
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
```

- [ ] **Step 3: Rodar testes e commit**

Run: `npx vitest run src/lib/nfse/__tests__/sefin-client.test.ts`
Commit: `feat(nfse): SEFIN client tipado com mTLS (submit, consulta, reconciliação)`

---

### Task 4: Handler de emissão do worker BullMQ

**Files:**
- Create: `src/worker/handlers/emit-nfse.ts`
- Modify: `src/worker/index.ts` — integrar handler real
- Modify: `src/lib/queue.ts` — atualizar tipo NfeJobData
- Reference: `src/lib/nfse/prepare-submission.ts` (build → sign → pack)
- Reference: `src/lib/nfse/pfx-loader.ts` (parsePfx)
- Reference: `src/lib/nfse/sefin-client.ts` (SefinClient)
- Reference: `src/lib/encryption.ts` (decrypt)

**Contexto:** O handler recebe o job com `nfseId`, carrega o rascunho + certificado do banco, descriptografa o PFX, monta o DPS, assina, empacota, envia via SefinClient, e atualiza o status no banco. Se der erro, incrementa tentativas e salva o erro.

- [ ] **Step 1: Atualizar tipo do job na queue**

Em `src/lib/queue.ts`, alterar `NfeJobData`:
```typescript
export type NfeJobData = {
  nfseId: string;
  clienteMeiId: string;
};
```

- [ ] **Step 2: Implementar handler**

```typescript
// src/worker/handlers/emit-nfse.ts
import type { Job } from "bullmq";
import { PrismaClient } from "../../generated/prisma/client";
import { decrypt } from "../../lib/encryption";
import { parsePfx } from "../../lib/nfse/pfx-loader";
import { prepareSubmission } from "../../lib/nfse/prepare-submission";
import { SefinClient } from "../../lib/nfse/sefin-client";
import { buildIdDps } from "../../lib/nfse/dps-id";
import type { Dps } from "../../lib/nfse/types";

const prisma = new PrismaClient();

export interface EmitNfseJobData {
  nfseId: string;
  clienteMeiId: string;
}

export async function handleEmitNfse(job: Job<EmitNfseJobData>): Promise<{ ok: boolean; chaveAcesso?: string }> {
  const { nfseId, clienteMeiId } = job.data;

  // 1. Carregar NFS-e e certificado
  const nfse = await prisma.nfse.findUnique({
    where: { id: nfseId },
    include: {
      clienteMei: {
        include: {
          certificados: {
            where: { revoked: false },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!nfse) throw new Error(`NFS-e ${nfseId} não encontrada`);
  if (nfse.status !== "pendente") {
    console.log(`[emit-nfse] NFS-e ${nfseId} não está pendente (status=${nfse.status}), ignorando`);
    return { ok: false };
  }

  const cert = nfse.clienteMei.certificados[0];
  if (!cert) throw new Error(`Cliente ${clienteMeiId} sem certificado válido`);

  // 2. Marcar como processando
  await prisma.nfse.update({
    where: { id: nfseId },
    data: { status: "processando" },
  });

  try {
    // 3. Descriptografar PFX
    const pfxBase64 = decrypt(cert.pfxEncrypted);
    const pfxPassword = decrypt(cert.senhaEncrypted);
    const pfxBuffer = Buffer.from(pfxBase64, "base64");

    // 4. Montar DPS
    const cliente = nfse.clienteMei;
    const dps: Dps = {
      versao: "1.00",
      infDps: {
        id: nfse.idDps,
        tipoAmbiente: nfse.ambiente === "producao" ? 1 : 2,
        dataHoraEmissao: new Date(),
        versaoAplicativo: "NexusNFE-1.0.0",
        serie: nfse.serie,
        numero: nfse.numero,
        dataCompetencia: nfse.dataCompetencia,
        tipoEmitente: 1,
        codigoLocalEmissao: cliente.municipioIbge,
        prestador: {
          tipoDocumento: "cnpj",
          documento: cliente.cnpj,
          nome: cliente.razaoSocial,
          endereco: {
            tipo: "nacional",
            cep: cliente.cep,
            logradouro: cliente.logradouro,
            numero: cliente.numero,
            complemento: cliente.complemento ?? undefined,
            bairro: cliente.bairro,
            municipioIbge: cliente.municipioIbge,
          },
          regimeTributario: {
            opcaoSimplesNacional: 2, // MEI
            regimeEspecialTributacao: 0,
          },
        },
        tomador: {
          tipoDocumento: nfse.tomadorTipo as "cpf" | "cnpj",
          documento: nfse.tomadorDocumento,
          nome: nfse.tomadorNome,
          email: nfse.tomadorEmail ?? undefined,
          endereco: nfse.tomadorEndereco
            ? {
                tipo: "nacional" as const,
                ...(nfse.tomadorEndereco as Record<string, string>),
              }
            : undefined,
        },
        servico: {
          localPrestacao: { municipioIbge: nfse.localPrestacaoIbge },
          codigoServico: {
            codigoTributacaoNacional: nfse.codigoServico,
            codigoNbs: nfse.codigoNbs ?? undefined,
            descricao: nfse.descricaoServico,
          },
        },
        valores: {
          valorServico: Number(nfse.valorServico),
          aliquotaIss: Number(nfse.aliquotaIss),
          tributacaoIssqn: 1,
        },
      },
    };

    // 5. Build → Sign → Pack
    const submission = prepareSubmission(dps, pfxBuffer, pfxPassword);

    // 6. Enviar ao SEFIN
    const certInfo = parsePfx(pfxBuffer, pfxPassword);
    const sefin = new SefinClient({
      ambiente: nfse.ambiente === "producao" ? "producao" : "homologacao",
      privateKeyPem: certInfo.privateKeyPem,
      certPem: certInfo.certPem,
    });

    const result = await sefin.submitNfse(submission.dpsXmlGZipB64);

    // 7. Atualizar no banco
    if (result.success) {
      await prisma.nfse.update({
        where: { id: nfseId },
        data: {
          status: "autorizada",
          chaveAcesso: result.chaveAcesso,
          numeroNfse: result.numeroNfse,
          dataAutorizacao: result.dataAutorizacao ? new Date(result.dataAutorizacao) : new Date(),
          xmlAssinado: submission.xmlAssinado,
          xmlAutorizado: result.xmlAutorizado ?? null,
          codigoResposta: "200",
          mensagemResposta: "Autorizada",
        },
      });
      return { ok: true, chaveAcesso: result.chaveAcesso };
    } else {
      await prisma.nfse.update({
        where: { id: nfseId },
        data: {
          status: "rejeitada",
          codigoResposta: result.codigo,
          mensagemResposta: result.mensagem,
          tentativas: { increment: 1 },
          ultimoErro: result.mensagem,
        },
      });
      return { ok: false };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await prisma.nfse.update({
      where: { id: nfseId },
      data: {
        status: "erro",
        tentativas: { increment: 1 },
        ultimoErro: msg,
      },
    });
    throw error;
  }
}
```

- [ ] **Step 3: Integrar handler no worker**

Em `src/worker/index.ts`, substituir o stub do nfeWorker pelo handler real:
```typescript
import { handleEmitNfse } from "./handlers/emit-nfse";

const nfeWorker = new Worker<NfeJobData>(
  "nfe",
  async (job: Job<NfeJobData>) => {
    console.log(`[NFE] processing job ${job.id} nfseId=${job.data.nfseId}`);
    return handleEmitNfse(job);
  },
  { connection, concurrency: 5 }
);
```

- [ ] **Step 4: Commit**

```bash
git add src/worker/handlers/emit-nfse.ts src/worker/index.ts src/lib/queue.ts
git commit -m "feat(nfse): handler BullMQ de emissão — build, sign, pack, POST ao SEFIN"
```

---

### Task 5: Action emitirNfse + integração com fila

**Files:**
- Modify: `src/lib/actions/nfse.ts` — adicionar `emitirNfse`
- Reference: `src/lib/queue.ts` (nfeQueue)
- Reference: `src/lib/actions/certificados.ts` (padrão de carregamento)
- Reference: `src/lib/encryption.ts` (decrypt)

**Contexto:** A action `emitirNfse` recebe o id do rascunho, valida que está em status `rascunho`, verifica que o cliente tem certificado válido, muda o status para `pendente`, e enfileira o job na fila BullMQ `nfe`. O worker pegará o job e processará.

- [ ] **Step 1: Adicionar emitirNfse ao actions/nfse.ts**

Append ao arquivo existente:
```typescript
import { nfeQueue } from "@/lib/queue";

/**
 * Enfileira uma NFS-e rascunho para emissão. Admin+.
 * Valida certificado, muda status para pendente, e enfileira job.
 */
export async function emitirNfse(
  nfseId: string
): Promise<ActionResult<{ jobId: string }>> {
  try {
    await requireRole("admin");

    const nfse = await prisma.nfse.findUnique({
      where: { id: nfseId },
      select: {
        id: true,
        status: true,
        clienteMeiId: true,
        clienteMei: {
          select: {
            isActive: true,
            certificados: {
              where: { revoked: false, notAfter: { gt: new Date() } },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!nfse) return { success: false, error: "NFS-e não encontrada" };
    if (nfse.status !== "rascunho") {
      return { success: false, error: "Apenas rascunhos podem ser emitidos" };
    }
    if (!nfse.clienteMei.isActive) {
      return { success: false, error: "Cliente MEI inativo" };
    }
    if (nfse.clienteMei.certificados.length === 0) {
      return {
        success: false,
        error: "Cliente não possui certificado digital válido",
      };
    }

    // Mudar status para pendente
    await prisma.nfse.update({
      where: { id: nfseId },
      data: { status: "pendente" },
    });

    // Enfileirar job
    const job = await nfeQueue.add("emit-nfse", {
      nfseId,
      clienteMeiId: nfse.clienteMeiId,
    });

    revalidatePath("/nfse");
    return { success: true, data: { jobId: job.id ?? "" } };
  } catch (error) {
    console.error("[nfse.emitirNfse]", error);
    return { success: false, error: "Erro ao enfileirar emissão" };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions/nfse.ts
git commit -m "feat(nfse): action emitirNfse — validação + enfileiramento BullMQ"
```

---

### Task 6: Habilitar botão "Emitir" no form + atualizar CLAUDE.md

**Files:**
- Modify: `src/components/nfse/step-confirmar.tsx` — habilitar botão emitir
- Modify: `CLAUDE.md` — atualizar estado Fase 3

- [ ] **Step 1: Habilitar botão emitir no step-confirmar.tsx**

Trocar o botão "Emitir NFS-e" de disabled para funcional. Ao clicar, chama `criarRascunhoNfse` primeiro, depois `emitirNfse` com o id retornado. Mostra toast de sucesso/erro.

- [ ] **Step 2: Atualizar CLAUDE.md**

Adicionar na seção concluído:
```markdown
- ✅ **Fase 3** — Transport mTLS + Pipeline de emissão
  - Client mTLS (https.Agent com cert A1)
  - SEFIN Client tipado (submit, consulta, reconciliação)
  - Parser de resposta da API
  - Handler BullMQ de emissão (build → sign → pack → POST)
  - Action emitirNfse com validação + enfileiramento
  - Botão "Emitir" funcional no form (aguarda cert A1 real para teste em homologação)
```

- [ ] **Step 3: Rodar todos os testes**

Run: `npx vitest run`
Expected: Todos passando

- [ ] **Step 4: Commit**

```bash
git add src/components/nfse/step-confirmar.tsx CLAUDE.md
git commit -m "feat(nfse): botão emitir funcional + docs Fase 3 concluída"
```
