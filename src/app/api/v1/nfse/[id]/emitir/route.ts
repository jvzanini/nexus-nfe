import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/api/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api/response";
import { nfeQueue } from "@/lib/queue";

/**
 * POST /api/v1/nfse/{id}/emitir — Enfileira NFS-e para emissão
 */
export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  await requireApiKey(request);
  const { id } = await params;

  const nfse = await prisma.nfse.findUnique({
    where: { id },
    select: {
      id: true, status: true, clienteMeiId: true,
      clienteMei: {
        select: {
          isActive: true,
          certificados: {
            where: { revoked: false, notAfter: { gt: new Date() } },
            select: { id: true }, take: 1,
          },
        },
      },
    },
  });

  if (!nfse) return apiError("NOT_FOUND", "NFS-e não encontrada", 404);
  if (nfse.status !== "rascunho") return apiError("INVALID_STATUS", "Apenas rascunhos podem ser emitidos", 422);
  if (!nfse.clienteMei.isActive) return apiError("CLIENT_INACTIVE", "Cliente MEI inativo", 422);
  if (nfse.clienteMei.certificados.length === 0) return apiError("NO_CERTIFICATE", "Cliente sem certificado digital válido", 422);

  await prisma.nfse.update({ where: { id }, data: { status: "pendente" } });

  const job = await nfeQueue.add("emit-nfse", { nfseId: id, clienteMeiId: nfse.clienteMeiId });

  return apiSuccess({ id, status: "pendente", jobId: job.id ?? "" });
});
