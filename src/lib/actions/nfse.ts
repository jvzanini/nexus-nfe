"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { criarNfseSchema, type CriarNfseInput } from "@/lib/validation/nfse";
import { reservarProximoNumeroDps } from "@/lib/actions/dps-numeracao";
import { nfeQueue } from "@/lib/queue";

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

export interface NfseDetail extends NfseListItem {
  ambiente: string;
  idDps: string;
  codigoNbs: string | null;
  localPrestacaoIbge: string;
  aliquotaIss: string;
  valorIss: string;
  tomadorTipo: string;
  tomadorEmail: string | null;
  tomadorEndereco: Record<string, string> | null;
  xmlAssinado: string | null;
  xmlAutorizado: string | null;
  chaveAcesso: string | null;
  numeroNfse: string | null;
  dataAutorizacao: Date | null;
  codigoResposta: string | null;
  mensagemResposta: string | null;
  tentativas: number;
  ultimoErro: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NfseFilters {
  clienteMeiId?: string;
  status?: string;
  dataInicio?: string;
  dataFim?: string;
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

export async function getNfseDetail(id: string): Promise<ActionResult<NfseDetail>> {
  try {
    await requireRole("admin");

    const n = await prisma.nfse.findUnique({
      where: { id },
      include: {
        clienteMei: { select: { razaoSocial: true } },
      },
    });

    if (!n) return { success: false, error: "NFS-e não encontrada" };

    return {
      success: true,
      data: {
        id: n.id,
        idDps: n.idDps,
        serie: n.serie,
        numero: n.numero,
        status: n.status,
        ambiente: n.ambiente,
        descricaoServico: n.descricaoServico,
        codigoServico: n.codigoServico,
        codigoNbs: n.codigoNbs,
        localPrestacaoIbge: n.localPrestacaoIbge,
        tomadorNome: n.tomadorNome,
        tomadorDocumento: n.tomadorDocumento,
        tomadorTipo: n.tomadorTipo,
        tomadorEmail: n.tomadorEmail,
        tomadorEndereco: n.tomadorEndereco as Record<string, string> | null,
        valorServico: n.valorServico.toString(),
        aliquotaIss: n.aliquotaIss.toString(),
        valorIss: n.valorIss.toString(),
        dataEmissao: n.dataEmissao,
        dataCompetencia: n.dataCompetencia,
        xmlAssinado: n.xmlAssinado,
        xmlAutorizado: n.xmlAutorizado,
        chaveAcesso: n.chaveAcesso,
        numeroNfse: n.numeroNfse,
        dataAutorizacao: n.dataAutorizacao,
        codigoResposta: n.codigoResposta,
        mensagemResposta: n.mensagemResposta,
        tentativas: n.tentativas,
        ultimoErro: n.ultimoErro,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        clienteMeiRazaoSocial: n.clienteMei.razaoSocial,
      },
    };
  } catch (error) {
    console.error("[nfse.getNfseDetail]", error);
    return { success: false, error: "Erro ao carregar detalhes da NFS-e" };
  }
}

/**
 * Retorna o XML assinado ou autorizado de uma NFS-e. Admin+.
 */
export async function downloadXmlNfse(
  id: string
): Promise<ActionResult<{ xml: string; filename: string }>> {
  try {
    await requireRole("admin");

    const n = await prisma.nfse.findUnique({
      where: { id },
      select: {
        xmlAutorizado: true,
        xmlAssinado: true,
        serie: true,
        numero: true,
        status: true,
      },
    });

    if (!n) return { success: false, error: "NFS-e não encontrada" };

    const xml = n.xmlAutorizado ?? n.xmlAssinado;
    if (!xml) {
      return { success: false, error: "XML não disponível para esta NFS-e" };
    }

    const filename = `nfse-${n.serie}-${n.numero}.xml`;
    return { success: true, data: { xml, filename } };
  } catch (error) {
    console.error("[nfse.downloadXmlNfse]", error);
    return { success: false, error: "Erro ao baixar XML" };
  }
}

export async function listarNfsesComFiltros(
  filters: NfseFilters = {}
): Promise<ActionResult<NfseListItem[]>> {
  try {
    await requireRole("admin");

    const where: Record<string, unknown> = {};
    if (filters.clienteMeiId) where.clienteMeiId = filters.clienteMeiId;
    if (filters.status) where.status = filters.status;
    if (filters.dataInicio || filters.dataFim) {
      where.dataEmissao = {
        ...(filters.dataInicio ? { gte: new Date(filters.dataInicio) } : {}),
        ...(filters.dataFim ? { lte: new Date(filters.dataFim + "T23:59:59Z") } : {}),
      };
    }

    const nfses = await prisma.nfse.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
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
    console.error("[nfse.listarNfsesComFiltros]", error);
    return { success: false, error: "Erro ao listar NFS-e" };
  }
}

/**
 * Enfileira uma NFS-e rascunho para emissão. Admin+.
 * Valida certificado, muda status para pendente, e enfileira job.
 */
export async function emitirNfse(
  nfseId: string
): Promise<ActionResult<{ jobId: string }>> {
  try {
    await requireRole("admin");

    const nfse = await prisma.nfse.findUnique({
      where: { id: nfseId },
      select: {
        id: true,
        status: true,
        clienteMeiId: true,
        clienteMei: {
          select: {
            isActive: true,
            certificados: {
              where: { revoked: false, notAfter: { gt: new Date() } },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!nfse) return { success: false, error: "NFS-e não encontrada" };
    if (nfse.status !== "rascunho") {
      return { success: false, error: "Apenas rascunhos podem ser emitidos" };
    }
    if (!nfse.clienteMei.isActive) {
      return { success: false, error: "Cliente MEI inativo" };
    }
    if (nfse.clienteMei.certificados.length === 0) {
      return { success: false, error: "Cliente não possui certificado digital válido" };
    }

    await prisma.nfse.update({
      where: { id: nfseId },
      data: { status: "pendente" },
    });

    const job = await nfeQueue.add("emit-nfse", {
      nfseId,
      clienteMeiId: nfse.clienteMeiId,
    });

    revalidatePath("/nfse");
    return { success: true, data: { jobId: job.id ?? "" } };
  } catch (error) {
    console.error("[nfse.emitirNfse]", error);
    return { success: false, error: "Erro ao enfileirar emissão" };
  }
}
