import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

interface SearchResponse {
  empresas: Array<{
    id: string;
    razaoSocial: string;
    cnpj: string;
    nomeFantasia: string | null;
  }>;
  nfse: Array<{
    id: string;
    serie: string;
    numero: string;
    descricaoServico: string;
    status: string;
    tomadorNome: string;
  }>;
  tomadores: Array<{
    id: string;
    nome: string;
    documento: string;
    clienteMeiId: string;
  }>;
  usuarios: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  api: Array<{
    path: string;
    description: string;
  }>;
}

const API_ENDPOINTS = [
  { path: "GET /api/v1/nfse", description: "Listar notas fiscais" },
  { path: "POST /api/v1/nfse", description: "Criar rascunho de NFS-e" },
  { path: "GET /api/v1/nfse/{id}", description: "Detalhes de uma NFS-e" },
  { path: "POST /api/v1/nfse/{id}/emitir", description: "Emitir NFS-e" },
  { path: "POST /api/v1/nfse/{id}/cancelar", description: "Cancelar NFS-e" },
  { path: "GET /api/v1/nfse/{id}/xml", description: "Download XML da NFS-e" },
  { path: "GET /api/v1/clientes", description: "Listar empresas MEI" },
  { path: "GET /api/v1/clientes/{id}", description: "Detalhes da empresa MEI" },
  { path: "GET /api/v1/clientes/{id}/faturamento", description: "Faturamento anual MEI" },
  { path: "GET /api/v1/catalogo/nbs", description: "Buscar códigos de tributação NBS" },
];

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get("q") ?? "";
    const query = rawQuery.trim();

    const empty: SearchResponse = {
      empresas: [],
      nfse: [],
      tomadores: [],
      usuarios: [],
      api: [],
    };

    if (!query || query.length < 2) {
      return NextResponse.json(empty);
    }

    const [empresas, nfses, tomadores, usuarios] = await Promise.all([
      // Empresas
      prisma.clienteMei.findMany({
        where: {
          OR: [
            { razaoSocial: { contains: query, mode: "insensitive" } },
            { cnpj: { contains: query } },
            { nomeFantasia: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, razaoSocial: true, cnpj: true, nomeFantasia: true },
      }),

      // NFS-e
      prisma.nfse.findMany({
        where: {
          OR: [
            { numero: { contains: query } },
            { descricaoServico: { contains: query, mode: "insensitive" } },
            { tomadorNome: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: {
          id: true,
          serie: true,
          numero: true,
          descricaoServico: true,
          status: true,
          tomadorNome: true,
        },
      }),

      // Tomadores
      prisma.tomadorFavorito.findMany({
        where: {
          OR: [
            { nome: { contains: query, mode: "insensitive" } },
            { documento: { contains: query } },
          ],
        },
        take: 5,
        select: { id: true, nome: true, documento: true, clienteMeiId: true },
      }),

      // Usuários
      prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 3,
        select: { id: true, name: true, email: true },
      }),
    ]);

    // API endpoints (filtro local)
    const lowerQuery = query.toLowerCase();
    const api = API_ENDPOINTS.filter(
      (e) =>
        e.path.toLowerCase().includes(lowerQuery) ||
        e.description.toLowerCase().includes(lowerQuery)
    ).slice(0, 3);

    const response: SearchResponse = {
      empresas,
      nfse: nfses,
      tomadores,
      usuarios,
      api,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[api/search]", error);
    return NextResponse.json({ error: "Erro na busca" }, { status: 500 });
  }
}
