import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/api/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api/response";

/**
 * GET /api/v1/nfse/{id} — Detalhes de uma NFS-e
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  await requireApiKey(request);
  const { id } = await params;

  const n = await prisma.nfse.findUnique({
    where: { id },
    include: { clienteMei: { select: { id: true, cnpj: true, razaoSocial: true } } },
  });

  if (!n) return apiError("NOT_FOUND", "NFS-e não encontrada", 404);

  return apiSuccess({
    ...n,
    valorServico: n.valorServico.toString(),
    aliquotaIss: n.aliquotaIss.toString(),
    valorIss: n.valorIss.toString(),
  });
});

/**
 * DELETE /api/v1/nfse/{id} — Excluir rascunho de NFS-e
 * Apenas NFS-e com status "rascunho" podem ser excluídas
 */
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  await requireApiKey(request);
  const { id } = await params;

  const nfse = await prisma.nfse.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!nfse) return apiError("NOT_FOUND", "NFS-e não encontrada", 404);
  if (nfse.status !== "rascunho") return apiError("INVALID_STATUS", "Apenas rascunhos podem ser excluídos", 422);

  await prisma.nfse.delete({ where: { id } });
  return apiSuccess({ id, deleted: true });
});
