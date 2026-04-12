import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/api/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api/response";

/**
 * POST /api/v1/nfse/{id}/cancelar — Cancela NFS-e autorizada
 * Body: { motivo: string }
 */
export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  await requireApiKey(request);
  const { id } = await params;
  const body = await request.json();
  const motivo = body?.motivo?.trim();

  if (!motivo || motivo.length < 5) {
    return apiError("VALIDATION", "Motivo obrigatório (mínimo 5 caracteres)", 422);
  }

  const nfse = await prisma.nfse.findUnique({
    where: { id },
    select: { id: true, status: true, dataAutorizacao: true },
  });

  if (!nfse) return apiError("NOT_FOUND", "NFS-e não encontrada", 404);
  if (nfse.status !== "autorizada") return apiError("INVALID_STATUS", "Apenas NFS-e autorizadas podem ser canceladas", 422);

  if (nfse.dataAutorizacao) {
    const horas = (Date.now() - nfse.dataAutorizacao.getTime()) / (1000 * 60 * 60);
    if (horas > 24) {
      return apiError("DEADLINE_EXPIRED", `Prazo de cancelamento expirado (${horas.toFixed(0)}h). Utilize substituição.`, 422);
    }
  }

  await prisma.nfse.update({
    where: { id },
    data: { status: "cancelada", mensagemResposta: `Cancelada via API: ${motivo}` },
  });

  return apiSuccess({ id, status: "cancelada" });
});
