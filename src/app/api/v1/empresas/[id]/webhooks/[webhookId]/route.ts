import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/api/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api/response";

const WEBHOOK_EVENTS = [
  "nfse.autorizada",
  "nfse.rejeitada",
  "nfse.cancelada",
] as const;

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * PUT /api/v1/empresas/{id}/webhooks/{webhookId} — Atualiza webhook
 * Body: { url?, events?, isActive?, rotateSecret? }
 */
export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; webhookId: string }> }
) => {
  await requireApiKey(request);
  const { id, webhookId } = await params;
  const body = await request.json();

  const webhook = await prisma.webhookEndpoint.findFirst({
    where: { id: webhookId, clienteMeiId: id },
    select: { id: true },
  });
  if (!webhook) return apiError("NOT_FOUND", "Webhook não encontrado", 404);

  const update: Record<string, unknown> = {};
  if (body.url !== undefined) {
    if (typeof body.url !== "string" || !isValidUrl(body.url)) {
      return apiError("VALIDATION", "URL inválida", 422);
    }
    update.url = body.url;
  }
  if (body.events !== undefined) {
    if (!Array.isArray(body.events)) {
      return apiError("VALIDATION", "events deve ser array", 422);
    }
    const valid = (body.events as unknown[])
      .filter((e): e is string => typeof e === "string")
      .filter((e) => (WEBHOOK_EVENTS as readonly string[]).includes(e));
    if (valid.length === 0) {
      return apiError("VALIDATION", "Informe ao menos um evento válido", 422);
    }
    update.events = valid;
  }
  if (body.isActive !== undefined) {
    update.isActive = !!body.isActive;
  }

  let rotatedSecret: string | null = null;
  if (body.rotateSecret === true) {
    rotatedSecret = `whsec_${randomBytes(24).toString("hex")}`;
    update.secret = rotatedSecret;
  }

  const updated = await prisma.webhookEndpoint.update({
    where: { id: webhookId },
    data: update,
    select: {
      id: true,
      url: true,
      events: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return apiSuccess({
    ...updated,
    ...(rotatedSecret ? { secret: rotatedSecret } : {}),
  });
});

/**
 * DELETE /api/v1/empresas/{id}/webhooks/{webhookId} — Remove webhook
 */
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; webhookId: string }> }
) => {
  await requireApiKey(request);
  const { id, webhookId } = await params;

  const webhook = await prisma.webhookEndpoint.findFirst({
    where: { id: webhookId, clienteMeiId: id },
    select: { id: true },
  });
  if (!webhook) return apiError("NOT_FOUND", "Webhook não encontrado", 404);

  await prisma.webhookEndpoint.delete({ where: { id: webhookId } });
  return apiSuccess({ id: webhookId, deleted: true });
});
