"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { criarNfseSchema, type CriarNfseInput } from "@/lib/validation/nfse";
import { reservarProximoNumeroDps } from "@/lib/actions/dps-numeracao";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface NfseListItem {
  id: string;
  idDps: string;
  serie: string;
  numero: string;
  status: string;
  descricaoServico: string;
  codigoServico: string;
  tomadorNome: string;
  tomadorDocumento: string;
  valorServico: string;
  dataEmissao: Date;
  dataCompetencia: Date;
  clienteMeiRazaoSocial: string;
}

export async function criarRascunhoNfse(
  input: CriarNfseInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const currentUser = await requireRole("admin");

    const parsed = criarNfseSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }

    const data = parsed.data;

    const cliente = await prisma.clienteMei.findUnique({
      where: { id: data.clienteMeiId },
      select: { id: true, isActive: true },
    });
    if (!cliente || !cliente.isActive) {
      return { success: false, error: "Cliente MEI não encontrado ou inativo" };
    }

    const numResult = await reservarProximoNumeroDps(data.clienteMeiId);
    if (!numResult.success || !numResult.data) {
      return { success: false, error: numResult.error ?? "Erro ao reservar número DPS" };
    }

    const { serie, numero, idDps } = numResult.data;

    const nfse = await prisma.nfse.create({
      data: {
        clienteMeiId: data.clienteMeiId,
        ambiente: "producao_restrita",
        status: "rascunho",
        idDps,
        serie,
        numero: String(numero),
        dataEmissao: new Date(),
        dataCompetencia: new Date(),
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
        tomadorEndereco: data.tomadorCep
          ? {
              cep: data.tomadorCep,
              logradouro: data.tomadorLogradouro,
              numero: data.tomadorNumero,
              complemento: data.tomadorComplemento,
              bairro: data.tomadorBairro,
              municipioIbge: data.tomadorMunicipioIbge,
            }
          : undefined,
        createdById: currentUser.id,
      },
      select: { id: true },
    });

    revalidatePath("/nfse");
    return { success: true, data: { id: nfse.id } };
  } catch (error) {
    console.error("[nfse.criarRascunhoNfse]", error);
    return { success: false, error: "Erro ao criar rascunho de NFS-e" };
  }
}

export async function listarNfses(
  clienteMeiId?: string
): Promise<ActionResult<NfseListItem[]>> {
  try {
    await requireRole("admin");

    const nfses = await prisma.nfse.findMany({
      where: clienteMeiId ? { clienteMeiId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, idDps: true, serie: true, numero: true, status: true,
        descricaoServico: true, codigoServico: true, tomadorNome: true,
        tomadorDocumento: true, valorServico: true, dataEmissao: true,
        dataCompetencia: true,
        clienteMei: { select: { razaoSocial: true } },
      },
    });

    const data: NfseListItem[] = nfses.map((n) => ({
      id: n.id, idDps: n.idDps, serie: n.serie, numero: n.numero,
      status: n.status, descricaoServico: n.descricaoServico,
      codigoServico: n.codigoServico, tomadorNome: n.tomadorNome,
      tomadorDocumento: n.tomadorDocumento,
      valorServico: n.valorServico.toString(),
      dataEmissao: n.dataEmissao, dataCompetencia: n.dataCompetencia,
      clienteMeiRazaoSocial: n.clienteMei.razaoSocial,
    }));

    return { success: true, data };
  } catch (error) {
    console.error("[nfse.listarNfses]", error);
    return { success: false, error: "Erro ao listar NFS-e" };
  }
}

export async function getNfse(id: string): Promise<ActionResult<NfseListItem>> {
  try {
    await requireRole("admin");

    const n = await prisma.nfse.findUnique({
      where: { id },
      select: {
        id: true, idDps: true, serie: true, numero: true, status: true,
        descricaoServico: true, codigoServico: true, tomadorNome: true,
        tomadorDocumento: true, valorServico: true, dataEmissao: true,
        dataCompetencia: true,
        clienteMei: { select: { razaoSocial: true } },
      },
    });

    if (!n) return { success: false, error: "NFS-e não encontrada" };

    return {
      success: true,
      data: {
        id: n.id, idDps: n.idDps, serie: n.serie, numero: n.numero,
        status: n.status, descricaoServico: n.descricaoServico,
        codigoServico: n.codigoServico, tomadorNome: n.tomadorNome,
        tomadorDocumento: n.tomadorDocumento,
        valorServico: n.valorServico.toString(),
        dataEmissao: n.dataEmissao, dataCompetencia: n.dataCompetencia,
        clienteMeiRazaoSocial: n.clienteMei.razaoSocial,
      },
    };
  } catch (error) {
    console.error("[nfse.getNfse]", error);
    return { success: false, error: "Erro ao carregar NFS-e" };
  }
}
