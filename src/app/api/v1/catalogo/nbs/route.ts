import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/api/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api/response";

/**
 * GET /api/v1/catalogo/nbs — Busca códigos de tributação nacional
 * Query: q (busca por descrição ou código), limit (default 20)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireApiKey(request);

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);

  if (!q || q.length < 2) {
    return apiError("VALIDATION", "Parâmetro q deve ter pelo menos 2 caracteres", 422);
  }

  const isCode = /^\d+$/.test(q);

  const results = await prisma.codigoTributacaoNacional.findMany({
    where: isCode
      ? { codigo: { startsWith: q } }
      : { descricao: { contains: q, mode: "insensitive" } },
    orderBy: { codigo: "asc" },
    take: limit,
  });

  const data = results.map((r) => ({
    codigo: r.codigo,
    descricao: r.descricao,
    nivel: r.nivel,
    aliquotaMin: r.aliquotaMin?.toString() ?? null,
    aliquotaMax: r.aliquotaMax?.toString() ?? null,
  }));

  return apiSuccess(data);
});
