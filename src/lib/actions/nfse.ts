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
  clienteMeiId: string;
  clienteMeiCnpj: string;
  clienteMeiMunicipioIbge: string;
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
        clienteMei: { select: { razaoSocial: true, cnpj: true, municipioIbge: true } },
      },
    });

    if (!n) return { success: false, error: "NFS-e não encontrada" };

    return {
      success: true,
      data: {
        id: n.id,
        clienteMeiId: n.clienteMeiId,
        clienteMeiCnpj: n.clienteMei.cnpj,
        clienteMeiMunicipioIbge: n.clienteMei.municipioIbge,
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

/**
 * Cancela uma NFS-e autorizada. Admin+.
 * Só permite cancelar dentro de 24h da autorização.
 * Na Fase 3 (com mTLS), fará POST /nfse/{chave}/eventos com tipo cancelamento.
 * Por agora, marca como cancelada no banco.
 */
export async function cancelarNfse(
  nfseId: string,
  motivo: string
): Promise<ActionResult> {
  try {
    await requireRole("admin");

    if (!motivo || motivo.trim().length < 5) {
      return { success: false, error: "Motivo do cancelamento é obrigatório (mínimo 5 caracteres)" };
    }

    const nfse = await prisma.nfse.findUnique({
      where: { id: nfseId },
      select: { id: true, status: true, dataAutorizacao: true, chaveAcesso: true },
    });

    if (!nfse) return { success: false, error: "NFS-e não encontrada" };
    if (nfse.status !== "autorizada") {
      return { success: false, error: "Apenas NFS-e autorizadas podem ser canceladas" };
    }

    // Verificar prazo de 24h
    if (nfse.dataAutorizacao) {
      const horasDesdeAutorizacao = (Date.now() - nfse.dataAutorizacao.getTime()) / (1000 * 60 * 60);
      if (horasDesdeAutorizacao > 24) {
        return {
          success: false,
          error: `Prazo de cancelamento expirado (${horasDesdeAutorizacao.toFixed(0)}h desde autorização). Utilize a substituição.`,
        };
      }
    }

    // TODO Fase 3: POST /nfse/{chave}/eventos com tipo cancelamento via SefinClient

    await prisma.nfse.update({
      where: { id: nfseId },
      data: {
        status: "cancelada",
        mensagemResposta: `Cancelada: ${motivo.trim()}`,
      },
    });

    revalidatePath("/nfse");
    revalidatePath(`/nfse/${nfseId}`);
    return { success: true };
  } catch (error) {
    console.error("[nfse.cancelarNfse]", error);
    return { success: false, error: "Erro ao cancelar NFS-e" };
  }
}

/**
 * Cria um rascunho de substituição para uma NFS-e existente. Admin+.
 * O rascunho terá o campo substitutaDe preenchido com o id da original.
 * Ao emitir, o XML incluirá o campo subst.chSubstda.
 */
export async function substituirNfse(
  nfseIdOriginal: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const currentUser = await requireRole("admin");

    const original = await prisma.nfse.findUnique({
      where: { id: nfseIdOriginal },
      include: {
        clienteMei: { select: { id: true, isActive: true } },
      },
    });

    if (!original) return { success: false, error: "NFS-e original não encontrada" };
    if (original.status !== "autorizada") {
      return { success: false, error: "Apenas NFS-e autorizadas podem ser substituídas" };
    }
    if (!original.chaveAcesso) {
      return { success: false, error: "NFS-e sem chave de acesso — não pode ser substituída" };
    }

    // Reservar número para a substituta
    const numResult = await reservarProximoNumeroDps(original.clienteMeiId);
    if (!numResult.success || !numResult.data) {
      return { success: false, error: numResult.error ?? "Erro ao reservar número DPS" };
    }

    const { serie, numero, idDps } = numResult.data;

    // Criar rascunho substituto com mesmos dados da original
    const substituta = await prisma.nfse.create({
      data: {
        clienteMeiId: original.clienteMeiId,
        ambiente: original.ambiente,
        status: "rascunho",
        idDps,
        serie,
        numero: String(numero),
        dataEmissao: new Date(),
        dataCompetencia: new Date(),
        descricaoServico: original.descricaoServico,
        codigoServico: original.codigoServico,
        codigoNbs: original.codigoNbs,
        localPrestacaoIbge: original.localPrestacaoIbge,
        valorServico: original.valorServico,
        aliquotaIss: original.aliquotaIss,
        valorIss: original.valorIss,
        tomadorTipo: original.tomadorTipo,
        tomadorDocumento: original.tomadorDocumento,
        tomadorNome: original.tomadorNome,
        tomadorEmail: original.tomadorEmail,
        tomadorEndereco: original.tomadorEndereco ?? undefined,
        substitutaDe: original.id,
        motivoSubstituicao: "Substituição de NFS-e",
        createdById: currentUser.id,
      },
      select: { id: true },
    });

    revalidatePath("/nfse");
    return { success: true, data: { id: substituta.id } };
  } catch (error) {
    console.error("[nfse.substituirNfse]", error);
    return { success: false, error: "Erro ao criar substituição" };
  }
}

/**
 * Retorna XMLs de NFS-e autorizadas de um período para export. Admin+.
 */
export async function exportarXmlsPeriodo(
  clienteMeiId: string,
  dataInicio: string,
  dataFim: string
): Promise<ActionResult<Array<{ filename: string; xml: string }>>> {
  try {
    await requireRole("admin");

    const nfses = await prisma.nfse.findMany({
      where: {
        clienteMeiId,
        status: "autorizada",
        dataEmissao: {
          gte: new Date(dataInicio),
          lte: new Date(dataFim + "T23:59:59Z"),
        },
      },
      select: {
        serie: true,
        numero: true,
        xmlAutorizado: true,
        xmlAssinado: true,
      },
      orderBy: { dataEmissao: "asc" },
    });

    const xmls = nfses
      .filter((n) => n.xmlAutorizado || n.xmlAssinado)
      .map((n) => ({
        filename: `nfse-${n.serie}-${n.numero}.xml`,
        xml: (n.xmlAutorizado ?? n.xmlAssinado)!,
      }));

    if (xmls.length === 0) {
      return { success: false, error: "Nenhuma NFS-e com XML disponível no período" };
    }

    return { success: true, data: xmls };
  } catch (error) {
    console.error("[nfse.exportarXmlsPeriodo]", error);
    return { success: false, error: "Erro ao exportar XMLs" };
  }
}
