"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { generateDanfsePdf } from "@/lib/nfse/pdf-generator";

export interface RelatorioFilters {
  dataInicio?: string; // YYYY-MM-DD
  dataFim?: string;
  clienteMeiId?: string;
  status?: string;
}

type ActionResult<T> = { success: boolean; data?: T; error?: string };

export interface RelatorioResumo {
  quantidade: number;
  totalEmitido: string;
  autorizadas: number;
  rejeitadas: number;
  canceladas: number;
  processando: number;
  ticketMedio: string;
}

export interface RelatorioSeriePonto {
  data: string; // YYYY-MM-DD
  quantidade: number;
  valor: string;
}

export interface RelatorioItem {
  id: string;
  empresaRazaoSocial: string;
  empresaCnpj: string;
  serie: string;
  numero: string;
  status: string;
  dataEmissao: Date;
  dataAutorizacao: Date | null;
  tomadorDocumento: string;
  tomadorNome: string;
  valorServico: string;
  valorIss: string;
  numeroNfse: string | null;
  chaveAcesso: string | null;
}

export interface RelatorioData {
  resumo: RelatorioResumo;
  serie: RelatorioSeriePonto[];
  items: RelatorioItem[];
}

function buildWhere(filters: RelatorioFilters) {
  const where: Record<string, unknown> = {};
  if (filters.clienteMeiId) where.clienteMeiId = filters.clienteMeiId;
  if (filters.status) where.status = filters.status;
  if (filters.dataInicio || filters.dataFim) {
    where.dataEmissao = {
      ...(filters.dataInicio ? { gte: new Date(filters.dataInicio) } : {}),
      ...(filters.dataFim ? { lte: new Date(filters.dataFim + "T23:59:59Z") } : {}),
    };
  }
  return where;
}

export async function gerarRelatorioEmissao(
  filters: RelatorioFilters = {}
): Promise<ActionResult<RelatorioData>> {
  try {
    await requireRole("admin");

    const where = buildWhere(filters);

    const nfses = await prisma.nfse.findMany({
      where,
      orderBy: { dataEmissao: "desc" },
      take: 1000,
      select: {
        id: true,
        serie: true,
        numero: true,
        status: true,
        dataEmissao: true,
        dataAutorizacao: true,
        tomadorNome: true,
        tomadorDocumento: true,
        valorServico: true,
        valorIss: true,
        numeroNfse: true,
        chaveAcesso: true,
        clienteMei: { select: { cnpj: true, razaoSocial: true } },
      },
    });

    const items: RelatorioItem[] = nfses.map((n) => ({
      id: n.id,
      empresaRazaoSocial: n.clienteMei.razaoSocial,
      empresaCnpj: n.clienteMei.cnpj,
      serie: n.serie,
      numero: n.numero,
      status: n.status,
      dataEmissao: n.dataEmissao,
      dataAutorizacao: n.dataAutorizacao,
      tomadorDocumento: n.tomadorDocumento,
      tomadorNome: n.tomadorNome,
      valorServico: n.valorServico.toString(),
      valorIss: n.valorIss.toString(),
      numeroNfse: n.numeroNfse,
      chaveAcesso: n.chaveAcesso,
    }));

    let total = 0;
    let autorizadas = 0;
    let rejeitadas = 0;
    let canceladas = 0;
    let processando = 0;
    const serieMap = new Map<string, { quantidade: number; valor: number }>();

    for (const n of nfses) {
      const v = Number(n.valorServico);
      total += v;
      if (n.status === "autorizada") autorizadas++;
      else if (n.status === "rejeitada" || n.status === "erro") rejeitadas++;
      else if (n.status === "cancelada") canceladas++;
      else if (n.status === "processando" || n.status === "pendente") processando++;

      const diaKey = n.dataEmissao.toISOString().slice(0, 10);
      const cur = serieMap.get(diaKey) ?? { quantidade: 0, valor: 0 };
      cur.quantidade += 1;
      cur.valor += v;
      serieMap.set(diaKey, cur);
    }

    const serie: RelatorioSeriePonto[] = Array.from(serieMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, v]) => ({
        data,
        quantidade: v.quantidade,
        valor: v.valor.toFixed(2),
      }));

    const ticketMedio = nfses.length > 0 ? total / nfses.length : 0;

    return {
      success: true,
      data: {
        resumo: {
          quantidade: nfses.length,
          totalEmitido: total.toFixed(2),
          autorizadas,
          rejeitadas,
          canceladas,
          processando,
          ticketMedio: ticketMedio.toFixed(2),
        },
        serie,
        items,
      },
    };
  } catch (error) {
    console.error("[relatorios.gerarRelatorioEmissao]", error);
    return { success: false, error: "Erro ao gerar relatório" };
  }
}

function csvEscape(value: string): string {
  if (value.includes(";") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDate(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export async function exportarRelatorioCsv(
  filters: RelatorioFilters = {}
): Promise<ActionResult<string>> {
  try {
    await requireRole("admin");

    const where = buildWhere(filters);

    const nfses = await prisma.nfse.findMany({
      where,
      orderBy: { dataEmissao: "asc" },
      select: {
        serie: true,
        numero: true,
        status: true,
        dataEmissao: true,
        dataAutorizacao: true,
        descricaoServico: true,
        codigoServico: true,
        tomadorNome: true,
        tomadorDocumento: true,
        valorServico: true,
        aliquotaIss: true,
        valorIss: true,
        chaveAcesso: true,
        numeroNfse: true,
        mensagemResposta: true,
        clienteMei: { select: { cnpj: true, razaoSocial: true } },
      },
    });

    const headers = [
      "CNPJ Emitente",
      "Razão Social Emitente",
      "Série",
      "Número",
      "Status",
      "Data Emissão",
      "Data Autorização",
      "Documento Tomador",
      "Nome Tomador",
      "Descrição",
      "Código Serviço",
      "Valor Serviço",
      "Alíquota ISS",
      "Valor ISS",
      "Chave de Acesso",
      "Número NFS-e",
      "Mensagem",
    ];

    const rows = nfses.map((n) =>
      [
        n.clienteMei.cnpj,
        n.clienteMei.razaoSocial,
        n.serie,
        n.numero,
        n.status,
        formatDate(n.dataEmissao),
        formatDate(n.dataAutorizacao),
        n.tomadorDocumento,
        n.tomadorNome,
        n.descricaoServico,
        n.codigoServico,
        n.valorServico.toString().replace(".", ","),
        n.aliquotaIss.toString().replace(".", ","),
        n.valorIss.toString().replace(".", ","),
        n.chaveAcesso ?? "",
        n.numeroNfse ?? "",
        n.mensagemResposta ?? "",
      ]
        .map(csvEscape)
        .join(";")
    );

    // BOM para Excel BR reconhecer UTF-8
    const csv = "\uFEFF" + headers.join(";") + "\n" + rows.join("\n");

    return { success: true, data: csv };
  } catch (error) {
    console.error("[relatorios.exportarRelatorioCsv]", error);
    return { success: false, error: "Erro ao exportar CSV" };
  }
}

/**
 * Exporta um ZIP contendo XMLs autorizados e PDFs (DANFS-e) das NFS-e do
 * período. Apenas notas com `chaveAcesso` (autorizadas) são incluídas.
 * Limite de 1000 notas por export para evitar timeout.
 */
export async function exportarLoteZip(
  filters: RelatorioFilters = {}
): Promise<ActionResult<{ zipBase64: string; quantidade: number }>> {
  try {
    await requireRole("admin");

    const where = buildWhere(filters);
    where.status = "autorizada";

    const nfses = await prisma.nfse.findMany({
      where,
      orderBy: { dataEmissao: "asc" },
      take: 1000,
      include: { clienteMei: true },
    });

    if (nfses.length === 0) {
      return { success: false, error: "Nenhuma NFS-e autorizada no período" };
    }

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    for (const n of nfses) {
      const baseName = `${n.clienteMei.cnpj}_${n.serie}-${n.numero}`;

      if (n.xmlAutorizado) {
        zip.file(`xmls/${baseName}.xml`, n.xmlAutorizado);
      } else if (n.xmlAssinado) {
        zip.file(`xmls/${baseName}.xml`, n.xmlAssinado);
      }

      try {
        const pdf = generateDanfsePdf({
          numero: n.numero,
          serie: n.serie,
          chaveAcesso: n.chaveAcesso,
          dataEmissao: n.dataEmissao.toLocaleDateString("pt-BR"),
          prestadorCnpj: n.clienteMei.cnpj,
          prestadorNome: n.clienteMei.razaoSocial,
          prestadorEndereco: `${n.clienteMei.logradouro}, ${n.clienteMei.numero} - ${n.clienteMei.bairro}, ${n.clienteMei.uf}`,
          tomadorDocumento: n.tomadorDocumento,
          tomadorNome: n.tomadorNome,
          tomadorEmail: n.tomadorEmail,
          codigoServico: n.codigoServico,
          descricaoServico: n.descricaoServico,
          valorServico: Number(n.valorServico),
          aliquotaIss: Number(n.aliquotaIss),
          valorIss: Number(n.valorIss),
        });
        zip.file(`pdfs/${baseName}.pdf`, pdf);
      } catch (err) {
        console.error(`[relatorios.exportarLoteZip] PDF falhou ${n.id}`, err);
      }
    }

    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    return {
      success: true,
      data: {
        zipBase64: buffer.toString("base64"),
        quantidade: nfses.length,
      },
    };
  } catch (error) {
    console.error("[relatorios.exportarLoteZip]", error);
    return { success: false, error: "Erro ao gerar ZIP" };
  }
}
