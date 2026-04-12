import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/api/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api/response";
import { LIMITE_MEI_ANUAL_2026 } from "@/lib/nfse/constants";

/**
 * GET /api/v1/clientes/{id}/faturamento — Faturamento anual do cliente
 * Query: ano (default: ano atual)
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  await requireApiKey(request);
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const ano = parseInt(searchParams.get("ano") ?? String(new Date().getFullYear()));

  const cliente = await prisma.clienteMei.findUnique({ where: { id }, select: { id: true } });
  if (!cliente) return apiError("NOT_FOUND", "Cliente não encontrado", 404);

  const fat = await prisma.faturamentoAnual.upsert({
    where: { clienteMeiId_ano: { clienteMeiId: id, ano } },
    create: { clienteMeiId: id, ano },
    update: {},
  });

  const total = Number(fat.totalEmitido);
  const limite = LIMITE_MEI_ANUAL_2026;
  const percentual = (total / limite) * 100;

  return apiSuccess({
    ano, totalEmitido: total, quantidadeNotas: fat.quantidadeNotas,
    limite, percentual: Math.round(percentual * 10) / 10,
    limiteExcedido: fat.limiteExcedido,
    faixa: percentual <= 80 ? "ok" : percentual <= 100 ? "atencao" : percentual <= 120 ? "alerta" : "bloqueado",
  });
});
