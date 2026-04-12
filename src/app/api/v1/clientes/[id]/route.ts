import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/api/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api/response";

/**
 * GET /api/v1/clientes/{id} — Detalhes do cliente MEI
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  await requireApiKey(request);
  const { id } = await params;

  const c = await prisma.clienteMei.findUnique({
    where: { id },
    include: {
      _count: { select: { nfses: true } },
      certificados: {
        where: { revoked: false },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, commonName: true, thumbprint: true, notBefore: true, notAfter: true, createdAt: true },
      },
      faturamentoAnual: {
        where: { ano: new Date().getFullYear() },
        take: 1,
      },
    },
  });

  if (!c) return apiError("NOT_FOUND", "Cliente não encontrado", 404);

  const cert = c.certificados[0];
  const fat = c.faturamentoAnual[0];

  return apiSuccess({
    id: c.id, cnpj: c.cnpj, razaoSocial: c.razaoSocial,
    nomeFantasia: c.nomeFantasia, inscricaoMunicipal: c.inscricaoMunicipal,
    email: c.email, telefone: c.telefone,
    endereco: { cep: c.cep, logradouro: c.logradouro, numero: c.numero, complemento: c.complemento, bairro: c.bairro, municipioIbge: c.municipioIbge, uf: c.uf },
    serieDpsAtual: c.serieDpsAtual, ultimoNumeroDps: c.ultimoNumeroDps,
    isActive: c.isActive, createdAt: c.createdAt,
    totalNfses: c._count.nfses,
    certificado: cert ? {
      id: cert.id, commonName: cert.commonName, thumbprint: cert.thumbprint,
      notBefore: cert.notBefore, notAfter: cert.notAfter,
      valido: cert.notAfter > new Date(),
    } : null,
    faturamentoAnual: fat ? {
      ano: fat.ano,
      totalEmitido: fat.totalEmitido.toString(),
      quantidadeNotas: fat.quantidadeNotas,
      limiteExcedido: fat.limiteExcedido,
    } : null,
  });
});
