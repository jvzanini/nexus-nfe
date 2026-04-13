import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/api/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api/response";

/**
 * GET /api/v1/configuracoes — Ler configurações da plataforma
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireApiKey(request);

  const settings = await prisma.globalSettings.findMany({
    select: { key: true, value: true, updatedAt: true },
  });

  // Filter out sensitive keys
  const safe = settings
    .filter((s) => s.key !== "API_KEYS")
    .map((s) => ({ key: s.key, value: s.value, updatedAt: s.updatedAt }));

  return apiSuccess(safe);
});

/**
 * POST /api/v1/configuracoes — Atualizar configuração
 * Body: { key: string, value: any }
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireApiKey(request);

  const body = await request.json();
  const { key, value } = body;

  if (!key || value === undefined) {
    return apiError("VALIDATION", "Campos obrigatórios: key, value", 422);
  }

  const forbidden = ["API_KEYS"];
  if (forbidden.includes(key)) {
    return apiError("FORBIDDEN", "Esta configuração não pode ser alterada via API", 403);
  }

  await prisma.globalSettings.upsert({
    where: { key },
    create: { key, value: JSON.stringify(value), updatedBy: "api" },
    update: { value: JSON.stringify(value) },
  });

  return apiSuccess({ key, value, updatedAt: new Date().toISOString() });
});
