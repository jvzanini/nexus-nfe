"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface ServicoMemorizadoItem {
  id: string;
  apelido: string;
  descricaoServico: string;
  valorPadrao: string;
  codigoServico: string;
  codigoNbs: string | null;
  localPrestacaoIbge: string;
  usoCount: number;
  ultimoUso: Date | null;
}

/**
 * Lista serviços memorizados de um cliente, ordenados por último uso.
 */
export async function listarServicosMemorizados(
  clienteMeiId: string
): Promise<ActionResult<ServicoMemorizadoItem[]>> {
  try {
    await requireRole("admin");

    const servicos = await prisma.servicoMemorizado.findMany({
      where: { clienteMeiId },
      orderBy: { ultimoUso: { sort: "desc", nulls: "last" } },
      take: 50,
    });

    const data: ServicoMemorizadoItem[] = servicos.map((s) => ({
      id: s.id,
      apelido: s.apelido,
      descricaoServico: s.descricaoServico,
      valorPadrao: s.valorPadrao.toString(),
      codigoServico: s.codigoServico,
      codigoNbs: s.codigoNbs,
      localPrestacaoIbge: s.localPrestacaoIbge,
      usoCount: s.usoCount,
      ultimoUso: s.ultimoUso,
    }));

    return { success: true, data };
  } catch (error) {
    console.error("[servicos-memorizados.listar]", error);
    return { success: false, error: "Erro ao listar serviços memorizados" };
  }
}

/**
 * Cria ou atualiza um serviço memorizado. Upsert por [clienteMeiId, apelido].
 */
export async function salvarServicoMemorizado(input: {
  clienteMeiId: string;
  apelido: string;
  descricaoServico: string;
  valorPadrao: number;
  codigoServico: string;
  codigoNbs?: string;
  localPrestacaoIbge?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole("admin");

    const result = await prisma.servicoMemorizado.upsert({
      where: {
        clienteMeiId_apelido: {
          clienteMeiId: input.clienteMeiId,
          apelido: input.apelido,
        },
      },
      create: {
        clienteMeiId: input.clienteMeiId,
        apelido: input.apelido,
        descricaoServico: input.descricaoServico,
        valorPadrao: input.valorPadrao,
        codigoServico: input.codigoServico,
        codigoNbs: input.codigoNbs ?? null,
        localPrestacaoIbge: input.localPrestacaoIbge ?? "5300108",
      },
      update: {
        descricaoServico: input.descricaoServico,
        valorPadrao: input.valorPadrao,
        codigoServico: input.codigoServico,
        codigoNbs: input.codigoNbs ?? null,
        localPrestacaoIbge: input.localPrestacaoIbge ?? "5300108",
      },
      select: { id: true },
    });

    return { success: true, data: { id: result.id } };
  } catch (error) {
    console.error("[servicos-memorizados.salvar]", error);
    return { success: false, error: "Erro ao salvar serviço memorizado" };
  }
}

/**
 * Incrementa usoCount e atualiza ultimoUso de um serviço memorizado.
 */
export async function registrarUsoServico(id: string): Promise<ActionResult> {
  try {
    await requireRole("admin");

    await prisma.servicoMemorizado.update({
      where: { id },
      data: {
        usoCount: { increment: 1 },
        ultimoUso: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[servicos-memorizados.registrarUso]", error);
    return { success: false, error: "Erro ao registrar uso" };
  }
}

/**
 * Remove um serviço memorizado.
 */
export async function excluirServicoMemorizado(id: string): Promise<ActionResult> {
  try {
    await requireRole("admin");
    await prisma.servicoMemorizado.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    console.error("[servicos-memorizados.excluir]", error);
    return { success: false, error: "Erro ao excluir serviço memorizado" };
  }
}
