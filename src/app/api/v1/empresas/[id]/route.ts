import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/api/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api/response";

/**
 * GET /api/v1/empresas/{id} — Detalhes da empresa MEI
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

  if (!c) return apiError("NOT_FOUND", "Empresa não encontrada", 404);

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

/**
 * PUT /api/v1/empresas/{id} — Atualizar empresa MEI
 */
export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  await requireApiKey(request);
  const { id } = await params;
  const body = await request.json();

  const empresa = await prisma.clienteMei.findUnique({ where: { id }, select: { id: true } });
  if (!empresa) return apiError("NOT_FOUND", "Empresa não encontrada", 404);

  const updateData: Record<string, unknown> = {};
  if (body.razaoSocial) updateData.razaoSocial = body.razaoSocial;
  if (body.nomeFantasia !== undefined) updateData.nomeFantasia = body.nomeFantasia || null;
  if (body.email !== undefined) updateData.email = body.email || null;
  if (body.telefone !== undefined) updateData.telefone = body.telefone || null;
  if (body.cep) updateData.cep = body.cep.replace(/\D/g, "");
  if (body.logradouro) updateData.logradouro = body.logradouro;
  if (body.numero) updateData.numero = body.numero;
  if (body.complemento !== undefined) updateData.complemento = body.complemento || null;
  if (body.bairro) updateData.bairro = body.bairro;
  if (body.municipioIbge) updateData.municipioIbge = body.municipioIbge;
  if (body.uf) updateData.uf = body.uf.toUpperCase();
  if (body.isActive !== undefined) updateData.isActive = body.isActive;

  const updated = await prisma.clienteMei.update({
    where: { id },
    data: updateData,
    select: { id: true, cnpj: true, razaoSocial: true, isActive: true, updatedAt: true },
  });

  return apiSuccess(updated);
});

/**
 * DELETE /api/v1/empresas/{id} — Desativar empresa MEI (soft delete)
 */
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  await requireApiKey(request);
  const { id } = await params;

  const empresa = await prisma.clienteMei.findUnique({ where: { id }, select: { id: true } });
  if (!empresa) return apiError("NOT_FOUND", "Empresa não encontrada", 404);

  await prisma.clienteMei.update({ where: { id }, data: { isActive: false } });
  return apiSuccess({ id, isActive: false });
});
