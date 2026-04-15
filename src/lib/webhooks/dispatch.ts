// Disparo de webhooks outbound — usado pelo worker outbox.
// Importável tanto pelo Next quanto pelo worker (paths relativos no worker).

import { createHmac, randomUUID } from "node:crypto";
import { prisma } from "../prisma";

const TIMEOUT_MS = 10_000;

export interface NfsePayload {
  event: string;
  nfseId: string;
  clienteMeiId: string;
  status: string;
  chaveAcesso: string | null;
  numeroNfse: string | null;
  serie: string;
  numero: string;
  valorServico: string;
  tomadorNome: string;
  tomadorDocumento: string;
  occurredAt: string;
}

interface DispatchResult {
  attempted: number;
  succeeded: number;
  failed: number;
}

export async function dispatchNfseEvent(
  payload: NfsePayload
): Promise<DispatchResult> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      clienteMeiId: payload.clienteMeiId,
      isActive: true,
      events: { has: payload.event },
    },
  });

  const result: DispatchResult = {
    attempted: endpoints.length,
    succeeded: 0,
    failed: 0,
  };

  for (const ep of endpoints) {
    const body = JSON.stringify(payload);
    const signature =
      "sha256=" + createHmac("sha256", ep.secret).update(body).digest("hex");
    const deliveryId = randomUUID();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let success = false;
    let errorMsg: string | null = null;

    try {
      const res = await fetch(ep.url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "nexus-nfe-webhooks/1.0",
          "X-Nexus-Event": payload.event,
          "X-Nexus-Signature": signature,
          "X-Nexus-Delivery": deliveryId,
        },
        body,
      });
      if (res.ok) {
        success = true;
      } else {
        errorMsg = `HTTP ${res.status}`;
      }
    } catch (err) {
      errorMsg =
        err instanceof Error
          ? err.name === "AbortError"
            ? "timeout"
            : err.message
          : String(err);
    } finally {
      clearTimeout(timeout);
    }

    if (success) result.succeeded++;
    else result.failed++;

    try {
      await prisma.webhookEndpoint.update({
        where: { id: ep.id },
        data: {
          lastStatus: success ? "success" : "error",
          lastAttemptAt: new Date(),
          lastError: success ? null : errorMsg,
          failureCount: success ? 0 : { increment: 1 },
        },
      });
    } catch (err) {
      console.error("[webhooks.dispatch] falha ao atualizar status", err);
    }
  }

  return result;
}
