import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/api/auth";
import { apiSuccess, apiCreated, apiError, withErrorHandler } from "@/lib/api/response";

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
 * GET /api/v1/empresas/{id}/webhooks — Lista webhooks de uma empresa
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  await requireApiKey(request);
  const { id } = await params;

  const empresa = await prisma.clienteMei.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!empresa) return apiError("NOT_FOUND", "Empresa não encontrada", 404);

  const webhooks = await prisma.webhookEndpoint.findMany({
    where: { clienteMeiId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      events: true,
      isActive: true,
      lastStatus: true,
      lastAttemptAt: true,
      failureCount: true,
      createdAt: true,
    },
  });

  return apiSuccess(webhooks);
});

/**
 * POST /api/v1/empresas/{id}/webhooks — Cria novo webhook
 * Body: { url, events[] }
 * Resposta: inclui `secret` exibido UMA única vez.
 */
export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const info = await requireApiKey(request);
  const { id } = await params;
  const body = await request.json();

  const empresa = await prisma.clienteMei.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!empresa) return apiError("NOT_FOUND", "Empresa não encontrada", 404);

  if (!body.url || typeof body.url !== "string") {
    return apiError("VALIDATION", "Campo obrigatório: url", 422);
  }
  if (!isValidUrl(body.url)) {
    return apiError("VALIDATION", "URL inválida (use http:// ou https://)", 422);
  }
  if (!Array.isArray(body.events) || body.events.length === 0) {
    return apiError("VALIDATION", "Informe ao menos um evento em events[]", 422);
  }
  const validEvents = (body.events as unknown[])
    .filter((e): e is string => typeof e === "string")
    .filter((e) => (WEBHOOK_EVENTS as readonly string[]).includes(e));
  if (validEvents.length === 0) {
    return apiError(
      "VALIDATION",
      `Eventos válidos: ${WEBHOOK_EVENTS.join(", ")}`,
      422
    );
  }

  const secret = `whsec_${randomBytes(24).toString("hex")}`;

  const created = await prisma.webhookEndpoint.create({
    data: {
      clienteMeiId: id,
      url: body.url,
      secret,
      events: validEvents,
      createdById: "00000000-0000-0000-0000-000000000000",
    },
    select: { id: true, url: true, events: true, isActive: true, createdAt: true },
  });

  return apiCreated({
    ...created,
    secret, // exibido apenas nesta resposta
    apiKeyName: info.name,
  });
});
