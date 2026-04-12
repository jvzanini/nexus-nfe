"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export interface NbsSearchResult {
  codigo: string;
  descricao: string;
  nivel: number;
  aliquotaMin: string | null;
  aliquotaMax: string | null;
}

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Busca códigos de tributação nacional por descrição ou código.
 * Retorna top 20 resultados ordenados por código.
 */
export async function searchNbs(
  query: string
): Promise<ActionResult<NbsSearchResult[]>> {
  try {
    await requireRole("admin");

    const q = query.trim();
    if (q.length < 2) {
      return { success: true, data: [] };
    }

    const isCodeSearch = /^\d+$/.test(q);

    const results = await prisma.codigoTributacaoNacional.findMany({
      where: isCodeSearch
        ? { codigo: { startsWith: q } }
        : { descricao: { contains: q, mode: "insensitive" } },
      orderBy: { codigo: "asc" },
      take: 20,
      select: {
        codigo: true,
        descricao: true,
        nivel: true,
        aliquotaMin: true,
        aliquotaMax: true,
      },
    });

    const data: NbsSearchResult[] = results.map((r) => ({
      codigo: r.codigo,
      descricao: r.descricao,
      nivel: r.nivel,
      aliquotaMin: r.aliquotaMin?.toString() ?? null,
      aliquotaMax: r.aliquotaMax?.toString() ?? null,
    }));

    return { success: true, data };
  } catch (error) {
    console.error("[nbs.searchNbs]", error);
    return { success: false, error: "Erro ao buscar códigos de tributação" };
  }
}

/**
 * Retorna um código específico pelo código exato.
 */
export async function getNbsByCodigo(
  codigo: string
): Promise<ActionResult<NbsSearchResult>> {
  try {
    await requireRole("admin");

    const result = await prisma.codigoTributacaoNacional.findUnique({
      where: { codigo },
      select: {
        codigo: true,
        descricao: true,
        nivel: true,
        aliquotaMin: true,
        aliquotaMax: true,
      },
    });

    if (!result) {
      return { success: false, error: "Código não encontrado" };
    }

    return {
      success: true,
      data: {
        ...result,
        aliquotaMin: result.aliquotaMin?.toString() ?? null,
        aliquotaMax: result.aliquotaMax?.toString() ?? null,
      },
    };
  } catch (error) {
    console.error("[nbs.getNbsByCodigo]", error);
    return { success: false, error: "Erro ao buscar código" };
  }
}
