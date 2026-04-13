import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/api/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api/response";

/**
 * GET /api/v1/empresas/{id}/notas — Lista NFS-e da empresa
 * Query: status, limit, offset
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  await requireApiKey(request);
  const { id } = await params;

  const empresa = await prisma.clienteMei.findUnique({ where: { id }, select: { id: true } });
  if (!empresa) return apiError("NOT_FOUND", "Empresa não encontrada", 404);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const where: Record<string, unknown> = { clienteMeiId: id };
  if (status) where.status = status;

  const [nfses, total] = await Promise.all([
    prisma.nfse.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true, idDps: true, serie: true, numero: true, status: true,
        ambiente: true, descricaoServico: true, codigoServico: true,
        tomadorNome: true, tomadorDocumento: true, tomadorTipo: true,
        valorServico: true, aliquotaIss: true, valorIss: true,
        dataEmissao: true, dataCompetencia: true,
        chaveAcesso: true, numeroNfse: true, dataAutorizacao: true,
        createdAt: true, updatedAt: true,
      },
    }),
    prisma.nfse.count({ where }),
  ]);

  const data = nfses.map((n) => ({
    ...n,
    valorServico: n.valorServico.toString(),
    aliquotaIss: n.aliquotaIss.toString(),
    valorIss: n.valorIss.toString(),
  }));

  return apiSuccess(data, 200, { total, limit, page: Math.floor(offset / limit) + 1 });
});
