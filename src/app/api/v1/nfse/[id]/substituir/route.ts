import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/api/auth";
import { apiCreated, apiError, withErrorHandler } from "@/lib/api/response";
import { reservarProximoNumeroDps } from "@/lib/actions/dps-numeracao";

/**
 * POST /api/v1/nfse/{id}/substituir — Criar rascunho de substituição
 */
export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  await requireApiKey(request);
  const { id } = await params;

  const original = await prisma.nfse.findUnique({
    where: { id },
    include: { clienteMei: { select: { id: true, isActive: true } } },
  });

  if (!original) return apiError("NOT_FOUND", "NFS-e original não encontrada", 404);
  if (original.status !== "autorizada") return apiError("INVALID_STATUS", "Apenas NFS-e autorizadas podem ser substituídas", 422);
  if (!original.chaveAcesso) return apiError("NO_KEY", "NFS-e sem chave de acesso", 422);

  const numResult = await reservarProximoNumeroDps(original.clienteMeiId);
  if (!numResult.success || !numResult.data) {
    return apiError("DPS_NUMBER", numResult.error ?? "Erro ao reservar número", 500);
  }

  const { serie, numero, idDps } = numResult.data;

  const substituta = await prisma.nfse.create({
    data: {
      clienteMeiId: original.clienteMeiId,
      ambiente: original.ambiente,
      status: "rascunho",
      idDps, serie, numero: String(numero),
      dataEmissao: new Date(), dataCompetencia: new Date(),
      descricaoServico: original.descricaoServico,
      codigoServico: original.codigoServico,
      codigoNbs: original.codigoNbs,
      localPrestacaoIbge: original.localPrestacaoIbge,
      valorServico: original.valorServico,
      aliquotaIss: original.aliquotaIss,
      valorIss: original.valorIss,
      tomadorTipo: original.tomadorTipo,
      tomadorDocumento: original.tomadorDocumento,
      tomadorNome: original.tomadorNome,
      tomadorEmail: original.tomadorEmail,
      tomadorEndereco: original.tomadorEndereco ?? undefined,
      substitutaDe: original.id,
      motivoSubstituicao: "Substituição via API",
      createdById: "api",
    },
    select: { id: true, idDps: true, serie: true, numero: true, status: true },
  });

  return apiCreated(substituta);
});
