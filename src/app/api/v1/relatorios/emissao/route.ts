import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/api/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api/response";

/**
 * GET /api/v1/relatorios/emissao — Relatório de emissões por período
 * Query: dataInicio, dataFim, clienteMeiId (opcional)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireApiKey(request);

  const { searchParams } = new URL(request.url);
  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");
  const clienteMeiId = searchParams.get("clienteMeiId");

  if (!dataInicio || !dataFim) {
    return apiError("VALIDATION", "Parâmetros obrigatórios: dataInicio, dataFim (YYYY-MM-DD)", 422);
  }

  const where: Record<string, unknown> = {
    dataEmissao: {
      gte: new Date(dataInicio),
      lte: new Date(dataFim + "T23:59:59Z"),
    },
  };
  if (clienteMeiId) where.clienteMeiId = clienteMeiId;

  const nfses = await prisma.nfse.findMany({
    where,
    orderBy: { dataEmissao: "asc" },
    select: {
      id: true, serie: true, numero: true, status: true,
      descricaoServico: true, codigoServico: true,
      valorServico: true, aliquotaIss: true, valorIss: true,
      tomadorNome: true, tomadorDocumento: true,
      dataEmissao: true, dataAutorizacao: true,
      chaveAcesso: true, numeroNfse: true,
      clienteMei: { select: { cnpj: true, razaoSocial: true } },
    },
  });

  // Aggregate stats
  const autorizadas = nfses.filter((n) => n.status === "autorizada");
  const totalEmitido = autorizadas.reduce((sum, n) => sum + Number(n.valorServico), 0);
  const totalIss = autorizadas.reduce((sum, n) => sum + Number(n.valorIss), 0);

  const byStatus: Record<string, number> = {};
  for (const n of nfses) {
    byStatus[n.status] = (byStatus[n.status] ?? 0) + 1;
  }

  return apiSuccess({
    periodo: { inicio: dataInicio, fim: dataFim },
    resumo: {
      totalNotas: nfses.length,
      autorizadas: autorizadas.length,
      totalEmitido: totalEmitido.toFixed(2),
      totalIss: totalIss.toFixed(2),
      porStatus: byStatus,
    },
    notas: nfses.map((n) => ({
      ...n,
      valorServico: Number(n.valorServico).toFixed(2),
      aliquotaIss: Number(n.aliquotaIss).toFixed(2),
      valorIss: Number(n.valorIss).toFixed(2),
    })),
  });
});
