"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit-log";
import { executarAgendamento } from "@/lib/nfse-agendamentos/executor";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

const frequenciaEnum = z.enum([
  "unica",
  "mensal",
  "bimestral",
  "trimestral",
  "semestral",
  "anual",
]);

const criarSchema = z.object({
  clienteMeiId: z.string().uuid(),
  nome: z.string().trim().min(3).max(120),
  frequencia: frequenciaEnum,
  proximaExecucao: z.string().refine((s) => !isNaN(new Date(s).getTime()), "Data inválida"),
  diaMes: z.number().int().min(1).max(28).nullable().optional(),
  dataFinal: z.string().nullable().optional(),
  maxExecucoes: z.number().int().positive().nullable().optional(),
  codigoTributacaoNacional: z.string().trim().min(1),
  codigoNbs: z.string().trim().optional().or(z.literal("")).transform((v) => v || undefined),
  localPrestacaoIbge: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 7, "IBGE 7 dígitos"),
  aliquotaIss: z.number().min(0).max(100),
  descricaoServico: z.string().trim().min(5).max(2000),
  valorServico: z.number().positive().max(999_999_999.99),
  tributacaoIssqn: z.number().int().min(1).max(7).default(1),
  tomadorTipo: z.enum(["cpf", "cnpj"]),
  tomadorDocumento: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 11 || v.length === 14, "CPF ou CNPJ"),
  tomadorNome: z.string().trim().min(2).max(200),
  tomadorEmail: z.string().email().optional().or(z.literal("")).transform((v) => v || undefined),
});

export type CriarAgendamentoInput = z.infer<typeof criarSchema>;

export async function criarAgendamento(
  input: CriarAgendamentoInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireRole("admin");
    const parsed = criarSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }
    const d = parsed.data;

    const ag = await prisma.nfseAgendamento.create({
      data: {
        clienteMeiId: d.clienteMeiId,
        nome: d.nome,
        frequencia: d.frequencia,
        proximaExecucao: new Date(d.proximaExecucao),
        diaMes: d.diaMes ?? null,
        dataFinal: d.dataFinal ? new Date(d.dataFinal) : null,
        maxExecucoes: d.maxExecucoes ?? null,
        codigoTributacaoNacional: d.codigoTributacaoNacional,
        codigoNbs: d.codigoNbs ?? null,
        localPrestacaoIbge: d.localPrestacaoIbge,
        aliquotaIss: d.aliquotaIss,
        descricaoServico: d.descricaoServico,
        valorServico: d.valorServico,
        tributacaoIssqn: d.tributacaoIssqn,
        tomadorTipo: d.tomadorTipo,
        tomadorDocumento: d.tomadorDocumento,
        tomadorNome: d.tomadorNome,
        tomadorEmail: d.tomadorEmail ?? null,
        createdById: user.id,
      },
      select: { id: true },
    });

    await logAudit({
      action: "agendamento.criado",
      resourceType: "nfse_agendamento",
      resourceId: ag.id,
      actorId: user.id,
      actorLabel: user.email,
      details: { clienteMeiId: d.clienteMeiId, frequencia: d.frequencia },
    });

    revalidatePath("/nfse/agendamentos");
    return { success: true, data: { id: ag.id } };
  } catch (err) {
    console.error("[nfse-agendamentos.criar]", err);
    return { success: false, error: "Erro ao criar agendamento" };
  }
}

export interface AgendamentoListItem {
  id: string;
  nome: string;
  status: string;
  frequencia: string;
  proximaExecucao: Date;
  totalExecucoes: number;
  clienteMeiRazaoSocial: string;
  clienteMeiId: string;
  tomadorNome: string;
  valorServico: string;
  lastRunAt: Date | null;
}

export async function listarAgendamentos(
  filtros?: { clienteMeiId?: string; status?: string }
): Promise<ActionResult<AgendamentoListItem[]>> {
  try {
    await requireRole("admin");
    const where: any = {};
    if (filtros?.clienteMeiId) where.clienteMeiId = filtros.clienteMeiId;
    if (filtros?.status) where.status = filtros.status;

    const lista = await prisma.nfseAgendamento.findMany({
      where,
      orderBy: { proximaExecucao: "asc" },
      include: { clienteMei: { select: { razaoSocial: true } } },
      take: 100,
    });

    return {
      success: true,
      data: lista.map((a) => ({
        id: a.id,
        nome: a.nome,
        status: a.status,
        frequencia: a.frequencia,
        proximaExecucao: a.proximaExecucao,
        totalExecucoes: a.totalExecucoes,
        clienteMeiRazaoSocial: a.clienteMei.razaoSocial,
        clienteMeiId: a.clienteMeiId,
        tomadorNome: a.tomadorNome,
        valorServico: a.valorServico.toString(),
        lastRunAt: a.lastRunAt,
      })),
    };
  } catch (err) {
    console.error("[nfse-agendamentos.listar]", err);
    return { success: false, error: "Erro ao listar" };
  }
}

export interface AgendamentoDetalhe extends AgendamentoListItem {
  diaMes: number | null;
  dataFinal: Date | null;
  maxExecucoes: number | null;
  descricaoServico: string;
  codigoTributacaoNacional: string;
  aliquotaIss: string;
  tomadorDocumento: string;
  tomadorEmail: string | null;
  lastError: string | null;
  execucoes: Array<{
    id: string;
    executadoEm: Date;
    sucesso: boolean;
    erro: string | null;
    nfseId: string | null;
  }>;
}

export async function getAgendamento(
  id: string
): Promise<ActionResult<AgendamentoDetalhe>> {
  try {
    await requireRole("admin");
    const a = await prisma.nfseAgendamento.findUnique({
      where: { id },
      include: {
        clienteMei: { select: { razaoSocial: true } },
        execucoes: {
          orderBy: { executadoEm: "desc" },
          take: 50,
        },
      },
    });
    if (!a) return { success: false, error: "Agendamento não encontrado" };

    return {
      success: true,
      data: {
        id: a.id,
        nome: a.nome,
        status: a.status,
        frequencia: a.frequencia,
        proximaExecucao: a.proximaExecucao,
        totalExecucoes: a.totalExecucoes,
        clienteMeiRazaoSocial: a.clienteMei.razaoSocial,
        clienteMeiId: a.clienteMeiId,
        tomadorNome: a.tomadorNome,
        tomadorDocumento: a.tomadorDocumento,
        tomadorEmail: a.tomadorEmail,
        valorServico: a.valorServico.toString(),
        descricaoServico: a.descricaoServico,
        codigoTributacaoNacional: a.codigoTributacaoNacional,
        aliquotaIss: a.aliquotaIss.toString(),
        diaMes: a.diaMes,
        dataFinal: a.dataFinal,
        maxExecucoes: a.maxExecucoes,
        lastRunAt: a.lastRunAt,
        lastError: a.lastError,
        execucoes: a.execucoes.map((e) => ({
          id: e.id,
          executadoEm: e.executadoEm,
          sucesso: e.sucesso,
          erro: e.erro,
          nfseId: e.nfseId,
        })),
      },
    };
  } catch (err) {
    console.error("[nfse-agendamentos.get]", err);
    return { success: false, error: "Erro ao consultar" };
  }
}

export async function pausarAgendamento(id: string): Promise<ActionResult> {
  try {
    const user = await requireRole("admin");
    await prisma.nfseAgendamento.update({
      where: { id },
      data: { status: "pausado" },
    });
    await logAudit({
      action: "agendamento.pausado",
      resourceType: "nfse_agendamento",
      resourceId: id,
      actorId: user.id,
      actorLabel: user.email,
    });
    revalidatePath(`/nfse/agendamentos/${id}`);
    revalidatePath("/nfse/agendamentos");
    return { success: true };
  } catch (err) {
    console.error("[nfse-agendamentos.pausar]", err);
    return { success: false, error: "Erro ao pausar" };
  }
}

export async function retomarAgendamento(id: string): Promise<ActionResult> {
  try {
    const user = await requireRole("admin");
    await prisma.nfseAgendamento.update({
      where: { id },
      data: { status: "ativo" },
    });
    await logAudit({
      action: "agendamento.retomado",
      resourceType: "nfse_agendamento",
      resourceId: id,
      actorId: user.id,
      actorLabel: user.email,
    });
    revalidatePath(`/nfse/agendamentos/${id}`);
    revalidatePath("/nfse/agendamentos");
    return { success: true };
  } catch (err) {
    console.error("[nfse-agendamentos.retomar]", err);
    return { success: false, error: "Erro ao retomar" };
  }
}

export async function encerrarAgendamento(id: string): Promise<ActionResult> {
  try {
    const user = await requireRole("admin");
    await prisma.nfseAgendamento.update({
      where: { id },
      data: { status: "encerrado" },
    });
    await logAudit({
      action: "agendamento.encerrado",
      resourceType: "nfse_agendamento",
      resourceId: id,
      actorId: user.id,
      actorLabel: user.email,
    });
    revalidatePath(`/nfse/agendamentos/${id}`);
    revalidatePath("/nfse/agendamentos");
    return { success: true };
  } catch (err) {
    console.error("[nfse-agendamentos.encerrar]", err);
    return { success: false, error: "Erro ao encerrar" };
  }
}

export async function executarAgoraAgendamento(
  id: string
): Promise<ActionResult<{ nfseId: string }>> {
  try {
    const user = await requireRole("admin");
    const r = await executarAgendamento(id, { manual: true, actorId: user.id });
    if (!r.success || !r.nfseId) {
      return { success: false, error: r.error ?? "Erro ao executar" };
    }
    revalidatePath(`/nfse/agendamentos/${id}`);
    return { success: true, data: { nfseId: r.nfseId } };
  } catch (err) {
    console.error("[nfse-agendamentos.executarAgora]", err);
    return { success: false, error: "Erro ao executar agora" };
  }
}
