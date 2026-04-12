import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/api/auth";
import { apiSuccess, apiCreated, apiError, withErrorHandler } from "@/lib/api/response";
import { criarNfseSchema } from "@/lib/validation/nfse";
import { reservarProximoNumeroDps } from "@/lib/actions/dps-numeracao";

/**
 * GET /api/v1/nfse — Lista NFS-e com filtros opcionais
 * Query params: clienteMeiId, status, limit (default 50), offset (default 0)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireApiKey(request);

  const { searchParams } = new URL(request.url);
  const clienteMeiId = searchParams.get("clienteMeiId");
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const where: Record<string, unknown> = {};
  if (clienteMeiId) where.clienteMeiId = clienteMeiId;
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
        clienteMei: { select: { id: true, cnpj: true, razaoSocial: true } },
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

/**
 * POST /api/v1/nfse — Criar rascunho de NFS-e
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireApiKey(request);

  const body = await request.json();
  const parsed = criarNfseSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION", parsed.error.issues[0]?.message ?? "Dados inválidos", 422);
  }

  const data = parsed.data;

  const cliente = await prisma.clienteMei.findUnique({
    where: { id: data.clienteMeiId },
    select: { id: true, isActive: true },
  });
  if (!cliente?.isActive) {
    return apiError("CLIENT_NOT_FOUND", "Cliente MEI não encontrado ou inativo", 404);
  }

  const numResult = await reservarProximoNumeroDps(data.clienteMeiId);
  if (!numResult.success || !numResult.data) {
    return apiError("DPS_NUMBER", numResult.error ?? "Erro ao reservar número DPS", 500);
  }

  const { serie, numero, idDps } = numResult.data;

  const nfse = await prisma.nfse.create({
    data: {
      clienteMeiId: data.clienteMeiId,
      ambiente: "producao_restrita",
      status: "rascunho",
      idDps, serie, numero: String(numero),
      dataEmissao: new Date(), dataCompetencia: new Date(),
      descricaoServico: data.descricaoServico,
      codigoServico: data.codigoTributacaoNacional,
      codigoNbs: data.codigoNbs || null,
      localPrestacaoIbge: data.localPrestacaoIbge,
      valorServico: data.valorServico,
      aliquotaIss: data.aliquotaIss,
      valorIss: (data.valorServico * data.aliquotaIss) / 100,
      tomadorTipo: data.tomadorTipo,
      tomadorDocumento: data.tomadorDocumento,
      tomadorNome: data.tomadorNome,
      tomadorEmail: data.tomadorEmail || null,
      tomadorEndereco: data.tomadorCep ? {
        cep: data.tomadorCep, logradouro: data.tomadorLogradouro,
        numero: data.tomadorNumero, complemento: data.tomadorComplemento,
        bairro: data.tomadorBairro, municipioIbge: data.tomadorMunicipioIbge,
      } : undefined,
      createdById: "api",
    },
    select: { id: true, idDps: true, serie: true, numero: true, status: true },
  });

  return apiCreated(nfse);
});
