"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

type ActionResult<T = unknown> = { success: boolean; data?: T; error?: string };

export interface GrupoEmpresarialItem {
  id: string;
  nome: string;
  descricao: string | null;
  tomadoresCount: number;
}

export async function listarGrupos(clienteMeiId: string): Promise<ActionResult<GrupoEmpresarialItem[]>> {
  try {
    await requireRole("admin");
    const grupos = await prisma.grupoEmpresarial.findMany({
      where: { clienteMeiId },
      include: { _count: { select: { tomadores: true } } },
      orderBy: { nome: "asc" },
    });
    return { success: true, data: grupos.map(g => ({
      id: g.id, nome: g.nome, descricao: g.descricao, tomadoresCount: g._count.tomadores,
    })) };
  } catch (error) {
    console.error("[grupos.listar]", error);
    return { success: false, error: "Erro ao listar grupos" };
  }
}

export async function criarGrupo(clienteMeiId: string, nome: string, descricao?: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole("admin");
    const grupo = await prisma.grupoEmpresarial.create({
      data: { clienteMeiId, nome, descricao: descricao ?? null },
      select: { id: true },
    });
    return { success: true, data: grupo };
  } catch (error) {
    if ((error as any)?.code === "P2002") return { success: false, error: "Grupo com este nome já existe" };
    console.error("[grupos.criar]", error);
    return { success: false, error: "Erro ao criar grupo" };
  }
}

export async function excluirGrupo(id: string): Promise<ActionResult> {
  try {
    await requireRole("admin");
    await prisma.grupoEmpresarial.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    console.error("[grupos.excluir]", error);
    return { success: false, error: "Erro ao excluir grupo" };
  }
}

export async function vincularTomadorAoGrupo(tomadorId: string, grupoId: string | null): Promise<ActionResult> {
  try {
    await requireRole("admin");
    await prisma.tomadorFavorito.update({
      where: { id: tomadorId },
      data: { grupoId },
    });
    return { success: true };
  } catch (error) {
    console.error("[grupos.vincular]", error);
    return { success: false, error: "Erro ao vincular tomador" };
  }
}
