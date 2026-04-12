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
