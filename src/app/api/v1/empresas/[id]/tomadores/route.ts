import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/api/auth";
import { apiSuccess, apiCreated, apiError, withErrorHandler } from "@/lib/api/response";

/**
 * GET /api/v1/empresas/{id}/tomadores — Lista tomadores favoritos da empresa
 * Query: limit, offset
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
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const [tomadores, total] = await Promise.all([
    prisma.tomadorFavorito.findMany({
      where: { clienteMeiId: id },
      orderBy: { ultimoUso: { sort: "desc", nulls: "last" } },
      take: limit,
      skip: offset,
      select: {
        id: true, tipo: true, documento: true, nome: true,
        email: true, endereco: true, usoCount: true, ultimoUso: true,
        createdAt: true,
      },
    }),
    prisma.tomadorFavorito.count({ where: { clienteMeiId: id } }),
  ]);

  return apiSuccess(tomadores, 200, { total, limit, page: Math.floor(offset / limit) + 1 });
});

/**
 * POST /api/v1/empresas/{id}/tomadores — Criar/atualizar tomador favorito (upsert por documento)
 */
export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  await requireApiKey(request);
  const { id } = await params;

  const empresa = await prisma.clienteMei.findUnique({ where: { id }, select: { id: true } });
  if (!empresa) return apiError("NOT_FOUND", "Empresa não encontrada", 404);

  const body = await request.json();
  const { tipo, documento, nome } = body;
  if (!tipo || !documento || !nome) {
    return apiError("VALIDATION", "Campos obrigatórios: tipo, documento, nome", 422);
  }

  const docClean = documento.replace(/\D/g, "");

  const tomador = await prisma.tomadorFavorito.upsert({
    where: { clienteMeiId_documento: { clienteMeiId: id, documento: docClean } },
    create: {
      clienteMeiId: id,
      tipo,
      documento: docClean,
      nome,
      email: body.email ?? null,
      endereco: body.endereco ?? null,
      usoCount: 1,
      ultimoUso: new Date(),
    },
    update: {
      nome,
      email: body.email ?? null,
      endereco: body.endereco ?? null,
      usoCount: { increment: 1 },
      ultimoUso: new Date(),
    },
    select: {
      id: true, tipo: true, documento: true, nome: true,
      email: true, endereco: true, usoCount: true, ultimoUso: true,
    },
  });

  return apiCreated(tomador);
});
