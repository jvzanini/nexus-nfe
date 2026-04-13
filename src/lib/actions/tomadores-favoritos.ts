"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface TomadorFavoritoItem {
  id: string;
  tipo: string;
  documento: string;
  nome: string;
  email: string | null;
  endereco: Record<string, string> | null;
  usoCount: number;
  ultimoUso: Date | null;
}

/**
 * Lista tomadores favoritos de um cliente, ordenados por último uso.
 */
export async function listarTomadoresFavoritos(
  clienteMeiId: string
): Promise<ActionResult<TomadorFavoritoItem[]>> {
  try {
    await requireRole("admin");

    const tomadores = await prisma.tomadorFavorito.findMany({
      where: { clienteMeiId },
      orderBy: { ultimoUso: { sort: "desc", nulls: "last" } },
      take: 50,
    });

    const data: TomadorFavoritoItem[] = tomadores.map((t) => ({
      id: t.id,
      tipo: t.tipo,
      documento: t.documento,
      nome: t.nome,
      email: t.email,
      endereco: t.endereco as Record<string, string> | null,
      usoCount: t.usoCount,
      ultimoUso: t.ultimoUso,
    }));

    return { success: true, data };
  } catch (error) {
    console.error("[tomadores-favoritos.listar]", error);
    return { success: false, error: "Erro ao listar tomadores favoritos" };
  }
}

/**
 * Salva ou atualiza um tomador favorito. Upsert por [clienteMeiId, documento].
 */
export async function salvarTomadorFavorito(input: {
  clienteMeiId: string;
  tipo: string;
  documento: string;
  nome: string;
  email?: string;
  endereco?: Record<string, string>;
}): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole("admin");

    const result = await prisma.tomadorFavorito.upsert({
      where: {
        clienteMeiId_documento: {
          clienteMeiId: input.clienteMeiId,
          documento: input.documento,
        },
      },
      create: {
        clienteMeiId: input.clienteMeiId,
        tipo: input.tipo,
        documento: input.documento,
        nome: input.nome,
        email: input.email ?? null,
        endereco: input.endereco ?? undefined,
      },
      update: {
        tipo: input.tipo,
        nome: input.nome,
        email: input.email ?? null,
        endereco: input.endereco ?? undefined,
      },
      select: { id: true },
    });

    return { success: true, data: { id: result.id } };
  } catch (error) {
    console.error("[tomadores-favoritos.salvar]", error);
    return { success: false, error: "Erro ao salvar tomador favorito" };
  }
}

/**
 * Incrementa usoCount e atualiza ultimoUso.
 */
export async function registrarUsoTomador(id: string): Promise<ActionResult> {
  try {
    await requireRole("admin");

    await prisma.tomadorFavorito.update({
      where: { id },
      data: {
        usoCount: { increment: 1 },
        ultimoUso: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[tomadores-favoritos.registrarUso]", error);
    return { success: false, error: "Erro ao registrar uso" };
  }
}

/**
 * Atualiza nome e/ou email de um tomador favorito.
 */
export async function atualizarTomadorFavorito(
  id: string,
  input: { nome: string; email?: string }
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole("admin");

    const result = await prisma.tomadorFavorito.update({
      where: { id },
      data: {
        nome: input.nome,
        email: input.email ?? null,
      },
      select: { id: true },
    });

    return { success: true, data: { id: result.id } };
  } catch (error) {
    console.error("[tomadores-favoritos.atualizar]", error);
    return { success: false, error: "Erro ao atualizar tomador favorito" };
  }
}

/**
 * Remove um tomador favorito.
 */
export async function excluirTomadorFavorito(id: string): Promise<ActionResult> {
  try {
    await requireRole("admin");
    await prisma.tomadorFavorito.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    console.error("[tomadores-favoritos.excluir]", error);
    return { success: false, error: "Erro ao excluir tomador favorito" };
  }
}
