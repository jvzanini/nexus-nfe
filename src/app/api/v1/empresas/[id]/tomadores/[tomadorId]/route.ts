import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/api/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api/response";

/**
 * DELETE /api/v1/empresas/{id}/tomadores/{tomadorId} — Remover tomador favorito
 */
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tomadorId: string }> }
) => {
  await requireApiKey(request);
  const { id, tomadorId } = await params;

  const tomador = await prisma.tomadorFavorito.findFirst({
    where: { id: tomadorId, clienteMeiId: id },
    select: { id: true },
  });

  if (!tomador) return apiError("NOT_FOUND", "Tomador não encontrado", 404);

  await prisma.tomadorFavorito.delete({ where: { id: tomadorId } });
  return apiSuccess({ id: tomadorId, deleted: true });
});
