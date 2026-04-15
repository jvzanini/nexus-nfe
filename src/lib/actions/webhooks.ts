"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const WEBHOOK_EVENTS = [
  "nfse.autorizada",
  "nfse.rejeitada",
  "nfse.cancelada",
] as const;

export type WebhookEventName = (typeof WEBHOOK_EVENTS)[number];

export interface WebhookItem {
  id: string;
  clienteMeiId: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastStatus: string | null;
  lastAttemptAt: Date | null;
  lastError: string | null;
  failureCount: number;
  createdAt: Date;
}

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

function generateSecret(): string {
  return `whsec_${randomBytes(24).toString("hex")}`;
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function listarWebhooks(
  clienteMeiId: string
): Promise<ActionResult<WebhookItem[]>> {
  try {
    await requireRole("admin");
    const rows = await prisma.webhookEndpoint.findMany({
      where: { clienteMeiId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        clienteMeiId: true,
        url: true,
        events: true,
        isActive: true,
        lastStatus: true,
        lastAttemptAt: true,
        lastError: true,
        failureCount: true,
        createdAt: true,
      },
    });
    return { success: true, data: rows };
  } catch (error) {
    console.error("[webhooks.listarWebhooks]", error);
    return { success: false, error: "Erro ao listar webhooks" };
  }
}

export async function criarWebhook(input: {
  clienteMeiId: string;
  url: string;
  events: string[];
}): Promise<ActionResult<{ id: string; secret: string }>> {
  try {
    const currentUser = await requireRole("admin");
    if (!isValidUrl(input.url)) {
      return { success: false, error: "URL inválida (use http:// ou https://)" };
    }
    const validEvents = input.events.filter((e) =>
      (WEBHOOK_EVENTS as readonly string[]).includes(e)
    );
    if (validEvents.length === 0) {
      return { success: false, error: "Selecione ao menos um evento" };
    }
    const secret = generateSecret();
    const created = await prisma.webhookEndpoint.create({
      data: {
        clienteMeiId: input.clienteMeiId,
        url: input.url,
        secret,
        events: validEvents,
        createdById: currentUser.id,
      },
      select: { id: true, secret: true },
    });
    revalidatePath(`/clientes/${input.clienteMeiId}`);
    return { success: true, data: created };
  } catch (error) {
    console.error("[webhooks.criarWebhook]", error);
    return { success: false, error: "Erro ao criar webhook" };
  }
}

export async function atualizarWebhook(
  id: string,
  input: { url?: string; events?: string[]; isActive?: boolean }
): Promise<ActionResult> {
  try {
    await requireRole("admin");
    const update: Record<string, unknown> = {};
    if (input.url !== undefined) {
      if (!isValidUrl(input.url)) {
        return { success: false, error: "URL inválida" };
      }
      update.url = input.url;
    }
    if (input.events !== undefined) {
      const valid = input.events.filter((e) =>
        (WEBHOOK_EVENTS as readonly string[]).includes(e)
      );
      if (valid.length === 0) {
        return { success: false, error: "Selecione ao menos um evento" };
      }
      update.events = valid;
    }
    if (input.isActive !== undefined) update.isActive = input.isActive;

    const webhook = await prisma.webhookEndpoint.update({
      where: { id },
      data: update,
      select: { clienteMeiId: true },
    });
    revalidatePath(`/clientes/${webhook.clienteMeiId}`);
    return { success: true };
  } catch (error) {
    console.error("[webhooks.atualizarWebhook]", error);
    return { success: false, error: "Erro ao atualizar webhook" };
  }
}

export async function excluirWebhook(id: string): Promise<ActionResult> {
  try {
    await requireRole("admin");
    const webhook = await prisma.webhookEndpoint.delete({
      where: { id },
      select: { clienteMeiId: true },
    });
    revalidatePath(`/clientes/${webhook.clienteMeiId}`);
    return { success: true };
  } catch (error) {
    console.error("[webhooks.excluirWebhook]", error);
    return { success: false, error: "Erro ao excluir webhook" };
  }
}

export async function rotacionarSecret(
  id: string
): Promise<ActionResult<{ secret: string }>> {
  try {
    await requireRole("admin");
    const secret = generateSecret();
    const webhook = await prisma.webhookEndpoint.update({
      where: { id },
      data: { secret },
      select: { clienteMeiId: true },
    });
    revalidatePath(`/clientes/${webhook.clienteMeiId}`);
    return { success: true, data: { secret } };
  } catch (error) {
    console.error("[webhooks.rotacionarSecret]", error);
    return { success: false, error: "Erro ao rotacionar secret" };
  }
}
