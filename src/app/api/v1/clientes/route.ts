import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/api/auth";
import { apiSuccess, apiCreated, apiError, withErrorHandler } from "@/lib/api/response";

/**
 * GET /api/v1/clientes — Lista clientes MEI
 * Query: active (true/false), limit, offset
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireApiKey(request);

  const { searchParams } = new URL(request.url);
  const active = searchParams.get("active");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const where: Record<string, unknown> = {};
  if (active === "true") where.isActive = true;
  if (active === "false") where.isActive = false;

  const [clientes, total] = await Promise.all([
    prisma.clienteMei.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true, cnpj: true, razaoSocial: true, nomeFantasia: true,
        email: true, telefone: true, municipioIbge: true, uf: true,
        serieDpsAtual: true, ultimoNumeroDps: true, isActive: true,
        createdAt: true,
        _count: { select: { nfses: true } },
        certificados: {
          where: { revoked: false },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { notAfter: true },
        },
      },
    }),
    prisma.clienteMei.count({ where }),
  ]);

  const now = new Date();
  const data = clientes.map((c) => {
    const cert = c.certificados[0];
    return {
      id: c.id, cnpj: c.cnpj, razaoSocial: c.razaoSocial,
      nomeFantasia: c.nomeFantasia, email: c.email, telefone: c.telefone,
      municipioIbge: c.municipioIbge, uf: c.uf,
      serieDpsAtual: c.serieDpsAtual, ultimoNumeroDps: c.ultimoNumeroDps,
      isActive: c.isActive, createdAt: c.createdAt,
      totalNfses: c._count.nfses,
      certificadoValido: cert ? cert.notAfter > now : false,
      certificadoExpiraEm: cert?.notAfter ?? null,
    };
  });

  return apiSuccess(data, 200, { total, limit, page: Math.floor(offset / limit) + 1 });
});

/**
 * POST /api/v1/clientes — Criar cliente MEI
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireApiKey(request);

  const body = await request.json();

  // Validate required fields
  const { cnpj, razaoSocial, cep, logradouro, numero, bairro, municipioIbge, uf } = body;
  if (!cnpj || !razaoSocial || !cep || !logradouro || !numero || !bairro || !municipioIbge || !uf) {
    return apiError("VALIDATION", "Campos obrigatórios: cnpj, razaoSocial, cep, logradouro, numero, bairro, municipioIbge, uf", 422);
  }

  const cnpjClean = cnpj.replace(/\D/g, "");
  if (cnpjClean.length !== 14) {
    return apiError("VALIDATION", "CNPJ deve ter 14 dígitos", 422);
  }

  // Check duplicate
  const existing = await prisma.clienteMei.findUnique({ where: { cnpj: cnpjClean } });
  if (existing) {
    return apiError("DUPLICATE", "CNPJ já cadastrado", 409);
  }

  const cliente = await prisma.clienteMei.create({
    data: {
      cnpj: cnpjClean,
      razaoSocial: body.razaoSocial,
      nomeFantasia: body.nomeFantasia ?? null,
      inscricaoMunicipal: body.inscricaoMunicipal ?? null,
      email: body.email ?? null,
      telefone: body.telefone ?? null,
      cep: body.cep.replace(/\D/g, ""),
      logradouro: body.logradouro,
      numero: body.numero,
      complemento: body.complemento ?? null,
      bairro: body.bairro,
      municipioIbge: body.municipioIbge.replace(/\D/g, ""),
      uf: body.uf.toUpperCase(),
      codigoServicoPadrao: body.codigoServicoPadrao ?? null,
      createdById: "api",
    },
    select: { id: true, cnpj: true, razaoSocial: true, createdAt: true },
  });

  return apiCreated(cliente);
});
