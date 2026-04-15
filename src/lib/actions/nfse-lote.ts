"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit-log";
import { getNfeQueue } from "@/lib/queue";
import { reservarProximoNumeroDps } from "@/lib/actions/dps-numeracao";
import {
  previewLoteCore,
  type LotePreviewResult,
  type PreviewContext,
  type LoteItemValido,
} from "@/lib/nfse-lote/preview";
import {
  servicoPadraoSchema,
  type ServicoPadraoInput,
} from "@/lib/validation/nfse-lote";
import { LIMITE_MEI_ANUAL_2026 } from "@/lib/nfse/constants";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

const DEFAULT_MAX_ITENS = 500;
const DEFAULT_MAX_LOTES_SIMULTANEOS = 5;

async function resolverAmbienteAtivo(): Promise<"producao" | "producao_restrita"> {
  try {
    const row = await prisma.globalSettings.findUnique({
      where: { key: "AMBIENTE_NFSE" },
    });
    const v = row?.value as unknown;
    if (v === "producao") return "producao";
    return "producao_restrita";
  } catch {
    return "producao_restrita";
  }
}

async function readIntSetting(key: string, fallback: number): Promise<number> {
  try {
    const row = await prisma.globalSettings.findUnique({ where: { key } });
    if (!row) return fallback;
    const v = row.value as unknown;
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    }
    if (typeof v === "object" && v !== null && "valor" in (v as any)) {
      const n = Number((v as any).valor);
      return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

async function buildPreviewContext(
  clienteMeiId: string
): Promise<{ ctx: PreviewContext; servicoPadraoEmpresaRegime: "mei" | "simples" } | null> {
  const empresa = await prisma.clienteMei.findUnique({
    where: { id: clienteMeiId },
    include: {
      certificados: {
        where: { revoked: false },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!empresa) return null;

  const cert = empresa.certificados[0];
  const agora = new Date();
  const certificadoValido = !!cert && cert.notAfter > agora;
  const certificadoExpirado = !!cert && cert.notAfter <= agora;

  const anoAtual = new Date().getFullYear();
  const fat = await prisma.faturamentoAnual.findUnique({
    where: { clienteMeiId_ano: { clienteMeiId, ano: anoAtual } },
    select: { totalEmitido: true },
  });
  const faturamentoAtualReais = fat ? Number(fat.totalEmitido) : 0;

  const lotesSimultaneosAbertos = await prisma.nfseLote.count({
    where: {
      clienteMeiId,
      status: { in: ["pendente", "processando"] },
    },
  });

  const maxItens = await readIntSetting("lote.max_itens", DEFAULT_MAX_ITENS);
  const maxLotesSimultaneos = await readIntSetting(
    "lote.max_simultaneos_empresa",
    DEFAULT_MAX_LOTES_SIMULTANEOS
  );

  const ctx: PreviewContext = {
    empresaAtiva: empresa.isActive,
    certificadoValido,
    certificadoExpirado,
    faturamentoAtualReais,
    limiteMeiReais: LIMITE_MEI_ANUAL_2026,
    empresaEhMei: empresa.regimeTributario === "mei",
    lotesSimultaneosAbertos,
    maxLotesSimultaneos,
    maxItens,
  };
  return { ctx, servicoPadraoEmpresaRegime: empresa.regimeTributario as any };
}

export async function previewLoteCsv(input: {
  clienteMeiId: string;
  servicoPadrao: ServicoPadraoInput;
  csvText: string;
}): Promise<ActionResult<LotePreviewResult>> {
  try {
    await requireRole("admin");

    const servicoParsed = servicoPadraoSchema.safeParse(input.servicoPadrao);
    if (!servicoParsed.success) {
      return {
        success: false,
        error: servicoParsed.error.issues[0]?.message ?? "Serviço padrão inválido",
      };
    }

    const ctxResult = await buildPreviewContext(input.clienteMeiId);
    if (!ctxResult) return { success: false, error: "Empresa não encontrada" };

    const preview = previewLoteCore(servicoParsed.data, input.csvText, ctxResult.ctx);
    return { success: true, data: preview };
  } catch (err) {
    console.error("[nfse-lote.previewLoteCsv]", err);
    return { success: false, error: "Erro ao analisar CSV" };
  }
}

export async function criarLote(input: {
  clienteMeiId: string;
  servicoPadrao: ServicoPadraoInput;
  csvText: string;
  nomeArquivo?: string;
}): Promise<ActionResult<{ loteId: string; totalCriados: number }>> {
  try {
    const user = await requireRole("admin");

    const servicoParsed = servicoPadraoSchema.safeParse(input.servicoPadrao);
    if (!servicoParsed.success) {
      return {
        success: false,
        error: servicoParsed.error.issues[0]?.message ?? "Serviço padrão inválido",
      };
    }
    const servicoPadrao = servicoParsed.data;

    const ctxResult = await buildPreviewContext(input.clienteMeiId);
    if (!ctxResult) return { success: false, error: "Empresa não encontrada" };

    const preview = previewLoteCore(servicoPadrao, input.csvText, ctxResult.ctx);
    if (preview.bloqueios.length > 0) {
      return {
        success: false,
        error: preview.bloqueios.map((b) => b.mensagem).join(" • "),
      };
    }
    if (preview.validos.length === 0) {
      return { success: false, error: "Nenhum item válido no CSV" };
    }

    const empresa = await prisma.clienteMei.findUnique({
      where: { id: input.clienteMeiId },
      select: { id: true, municipioIbge: true },
    });
    if (!empresa) return { success: false, error: "Empresa não encontrada" };

    const ambiente = await resolverAmbienteAtivo();

    const resultado = await prisma.$transaction(
      async (tx) => {
        const lote = await tx.nfseLote.create({
          data: {
            clienteMeiId: input.clienteMeiId,
            status: "pendente",
            totalItens: preview.validos.length,
            nomeArquivo: input.nomeArquivo ?? null,
            servicoPadrao: servicoPadrao as unknown as object,
            createdById: user.id,
          },
          select: { id: true },
        });

        const itens: Array<{ itemId: string; nfseId: string }> = [];

        for (const v of preview.validos) {
          const numResult = await reservarProximoNumeroDpsTx(
            tx,
            input.clienteMeiId
          );

          const tomadorFavorito = await tx.tomadorFavorito.findUnique({
            where: {
              clienteMeiId_documento: {
                clienteMeiId: input.clienteMeiId,
                documento: v.documento,
              },
            },
            select: {
              endereco: true,
              email: true,
              nome: true,
            },
          });

          const tomadorEndereco = tomadorFavorito?.endereco ?? null;

          const nfse = await tx.nfse.create({
            data: {
              clienteMeiId: input.clienteMeiId,
              ambiente,
              status: "pendente",
              idDps: numResult.idDps,
              serie: numResult.serie,
              numero: String(numResult.numero),
              dataEmissao: new Date(),
              dataCompetencia: v.dataCompetencia,
              descricaoServico: v.descricaoServico,
              codigoServico: servicoPadrao.codigoTributacaoNacional,
              codigoNbs: servicoPadrao.codigoNbs ?? null,
              localPrestacaoIbge: servicoPadrao.localPrestacaoIbge,
              valorServico: v.valorServico,
              aliquotaIss: servicoPadrao.aliquotaIss,
              valorIss: (v.valorServico * servicoPadrao.aliquotaIss) / 100,
              tomadorTipo: v.tipo,
              tomadorDocumento: v.documento,
              tomadorNome: v.nome,
              tomadorEmail: v.email ?? tomadorFavorito?.email ?? null,
              tomadorEndereco: tomadorEndereco as any,
              createdById: user.id,
            },
            select: { id: true },
          });

          const item = await tx.nfseLoteItem.create({
            data: {
              loteId: lote.id,
              nfseId: nfse.id,
              linhaCsv: v.linha,
              status: "pendente",
              tomadorDocumento: v.documento,
              tomadorNome: v.nome,
              tomadorEmail: v.email,
              valorServico: v.valorServico,
              descricaoServico: v.descricaoServico,
              dataCompetencia: v.dataCompetencia,
            },
            select: { id: true },
          });

          itens.push({ itemId: item.id, nfseId: nfse.id });
        }

        return { loteId: lote.id, itens };
      },
      { timeout: 60_000 }
    );

    // Enqueue bulk fora da transação
    const queue = getNfeQueue();
    const jobs = await queue.addBulk(
      resultado.itens.map((i) => ({
        name: "emit-nfse",
        data: { nfseId: i.nfseId, clienteMeiId: input.clienteMeiId },
      }))
    );

    await Promise.all(
      jobs.map((job, idx) =>
        prisma.nfseLoteItem.update({
          where: { id: resultado.itens[idx].itemId },
          data: { queueJobId: job.id ?? null },
        })
      )
    );

    await logAudit({
      action: "lote.criado",
      resourceType: "nfse_lote",
      resourceId: resultado.loteId,
      actorId: user.id,
      actorLabel: user.email,
      details: {
        clienteMeiId: input.clienteMeiId,
        totalItens: preview.validos.length,
        totalValor: preview.totalValor,
        nomeArquivo: input.nomeArquivo ?? null,
      },
    });

    revalidatePath("/nfse/lote");
    revalidatePath("/nfse");

    return {
      success: true,
      data: { loteId: resultado.loteId, totalCriados: preview.validos.length },
    };
  } catch (err) {
    console.error("[nfse-lote.criarLote]", err);
    const msg = err instanceof Error ? err.message : "Erro ao criar lote";
    return { success: false, error: msg };
  }
}

async function reservarProximoNumeroDpsTx(
  tx: any,
  clienteMeiId: string
): Promise<{ serie: string; numero: number; idDps: string }> {
  const rows = await tx.$queryRaw<
    Array<{
      cnpj: string;
      serie_dps_atual: string;
      ultimo_numero_dps: number;
      municipio_ibge: string;
    }>
  >`
    SELECT cnpj, serie_dps_atual, ultimo_numero_dps, municipio_ibge
    FROM clientes_mei
    WHERE id = ${clienteMeiId}::uuid AND is_active = true
    FOR UPDATE
  `;
  if (rows.length === 0) throw new Error("Empresa não encontrada ou inativa");
  const cliente = rows[0];
  const novoNumero = cliente.ultimo_numero_dps + 1;

  await tx.clienteMei.update({
    where: { id: clienteMeiId },
    data: { ultimoNumeroDps: novoNumero },
  });

  const { buildIdDps } = await import("@/lib/nfse/dps-id");
  const idDps = buildIdDps({
    codigoLocalEmissao: cliente.municipio_ibge,
    tipoInscricao: 1,
    inscricaoFederal: cliente.cnpj,
    serie: cliente.serie_dps_atual,
    numero: String(novoNumero),
  });

  return { serie: cliente.serie_dps_atual, numero: novoNumero, idDps };
}

export interface LoteListItem {
  id: string;
  status: string;
  totalItens: number;
  nomeArquivo: string | null;
  createdAt: Date;
  finalizadoEm: Date | null;
  clienteMeiRazaoSocial: string;
  clienteMeiId: string;
  autorizadas: number;
  rejeitadas: number;
  pendentes: number;
}

export async function listarLotes(filtros?: {
  clienteMeiId?: string;
  status?: string;
}): Promise<ActionResult<LoteListItem[]>> {
  try {
    await requireRole("admin");

    const where: any = {};
    if (filtros?.clienteMeiId) where.clienteMeiId = filtros.clienteMeiId;
    if (filtros?.status) where.status = filtros.status;

    const lotes = await prisma.nfseLote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        clienteMei: { select: { razaoSocial: true } },
        itens: { select: { status: true } },
      },
    });

    const data: LoteListItem[] = lotes.map((l) => {
      let autorizadas = 0;
      let rejeitadas = 0;
      let pendentes = 0;
      for (const it of l.itens) {
        if (it.status === "autorizado") autorizadas++;
        else if (it.status === "rejeitado" || it.status === "erro") rejeitadas++;
        else if (it.status === "pendente" || it.status === "processando") pendentes++;
      }
      return {
        id: l.id,
        status: l.status,
        totalItens: l.totalItens,
        nomeArquivo: l.nomeArquivo,
        createdAt: l.createdAt,
        finalizadoEm: l.finalizadoEm,
        clienteMeiRazaoSocial: l.clienteMei.razaoSocial,
        clienteMeiId: l.clienteMeiId,
        autorizadas,
        rejeitadas,
        pendentes,
      };
    });

    return { success: true, data };
  } catch (err) {
    console.error("[nfse-lote.listarLotes]", err);
    return { success: false, error: "Erro ao listar lotes" };
  }
}

export interface LoteDetalhe {
  id: string;
  status: string;
  totalItens: number;
  nomeArquivo: string | null;
  createdAt: Date;
  finalizadoEm: Date | null;
  clienteMeiId: string;
  clienteMeiRazaoSocial: string;
  servicoPadrao: ServicoPadraoInput;
  stats: { autorizadas: number; rejeitadas: number; pendentes: number; cancelados: number };
  itens: Array<{
    id: string;
    linhaCsv: number;
    status: string;
    tomadorDocumento: string;
    tomadorNome: string;
    tomadorEmail: string | null;
    valorServico: string;
    descricaoServico: string;
    dataCompetencia: Date;
    nfseId: string | null;
    erro: string | null;
  }>;
}

export async function getLoteDetail(
  loteId: string
): Promise<ActionResult<LoteDetalhe>> {
  try {
    await requireRole("admin");

    const l = await prisma.nfseLote.findUnique({
      where: { id: loteId },
      include: {
        clienteMei: { select: { razaoSocial: true } },
        itens: { orderBy: { linhaCsv: "asc" } },
      },
    });
    if (!l) return { success: false, error: "Lote não encontrado" };

    let autorizadas = 0;
    let rejeitadas = 0;
    let pendentes = 0;
    let cancelados = 0;
    for (const it of l.itens) {
      if (it.status === "autorizado") autorizadas++;
      else if (it.status === "rejeitado" || it.status === "erro") rejeitadas++;
      else if (it.status === "cancelado") cancelados++;
      else pendentes++;
    }

    const detalhe: LoteDetalhe = {
      id: l.id,
      status: l.status,
      totalItens: l.totalItens,
      nomeArquivo: l.nomeArquivo,
      createdAt: l.createdAt,
      finalizadoEm: l.finalizadoEm,
      clienteMeiId: l.clienteMeiId,
      clienteMeiRazaoSocial: l.clienteMei.razaoSocial,
      servicoPadrao: l.servicoPadrao as unknown as ServicoPadraoInput,
      stats: { autorizadas, rejeitadas, pendentes, cancelados },
      itens: l.itens.map((it) => ({
        id: it.id,
        linhaCsv: it.linhaCsv,
        status: it.status,
        tomadorDocumento: it.tomadorDocumento,
        tomadorNome: it.tomadorNome,
        tomadorEmail: it.tomadorEmail,
        valorServico: it.valorServico.toString(),
        descricaoServico: it.descricaoServico,
        dataCompetencia: it.dataCompetencia,
        nfseId: it.nfseId,
        erro: it.erro,
      })),
    };

    return { success: true, data: detalhe };
  } catch (err) {
    console.error("[nfse-lote.getLoteDetail]", err);
    return { success: false, error: "Erro ao consultar lote" };
  }
}

export async function cancelarLote(
  loteId: string
): Promise<ActionResult<{ cancelados: number }>> {
  try {
    const user = await requireRole("admin");

    const lote = await prisma.nfseLote.findUnique({
      where: { id: loteId },
      include: { itens: { where: { status: "pendente" } } },
    });
    if (!lote) return { success: false, error: "Lote não encontrado" };
    if (lote.status !== "pendente") {
      return {
        success: false,
        error: "Só é possível cancelar lotes ainda pendentes",
      };
    }

    const queue = getNfeQueue();
    for (const item of lote.itens) {
      if (item.queueJobId) {
        try {
          const job = await queue.getJob(item.queueJobId);
          if (job) await job.remove();
        } catch (err) {
          console.warn("[nfse-lote.cancelarLote] job remove falhou", err);
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.nfseLoteItem.updateMany({
        where: { loteId, status: "pendente" },
        data: { status: "cancelado" },
      });
      await tx.nfseLote.update({
        where: { id: loteId },
        data: { status: "cancelado", finalizadoEm: new Date() },
      });
      return r.count;
    });

    await logAudit({
      action: "lote.cancelado",
      resourceType: "nfse_lote",
      resourceId: loteId,
      actorId: user.id,
      actorLabel: user.email,
      details: { cancelados: updated },
    });

    revalidatePath(`/nfse/lote/${loteId}`);
    revalidatePath("/nfse/lote");
    return { success: true, data: { cancelados: updated } };
  } catch (err) {
    console.error("[nfse-lote.cancelarLote]", err);
    return { success: false, error: "Erro ao cancelar lote" };
  }
}

export async function reprocessarRejeitadas(
  loteId: string
): Promise<ActionResult<{ reprocessados: number }>> {
  try {
    const user = await requireRole("admin");

    const lote = await prisma.nfseLote.findUnique({
      where: { id: loteId },
      include: {
        itens: {
          where: { status: { in: ["rejeitado", "erro"] } },
        },
      },
    });
    if (!lote) return { success: false, error: "Lote não encontrado" };
    if (lote.itens.length === 0) {
      return { success: false, error: "Nenhum item para reprocessar" };
    }

    const servicoPadrao = lote.servicoPadrao as unknown as ServicoPadraoInput;
    const ambiente = await resolverAmbienteAtivo();

    const novosItens: Array<{ itemId: string; nfseId: string }> = [];

    await prisma.$transaction(
      async (tx) => {
        for (const item of lote.itens) {
          const numResult = await reservarProximoNumeroDpsTx(tx, lote.clienteMeiId);
          const nova = await tx.nfse.create({
            data: {
              clienteMeiId: lote.clienteMeiId,
              ambiente,
              status: "pendente",
              idDps: numResult.idDps,
              serie: numResult.serie,
              numero: String(numResult.numero),
              dataEmissao: new Date(),
              dataCompetencia: item.dataCompetencia,
              descricaoServico: item.descricaoServico,
              codigoServico: servicoPadrao.codigoTributacaoNacional,
              codigoNbs: servicoPadrao.codigoNbs ?? null,
              localPrestacaoIbge: servicoPadrao.localPrestacaoIbge,
              valorServico: item.valorServico,
              aliquotaIss: servicoPadrao.aliquotaIss,
              valorIss:
                (Number(item.valorServico) * servicoPadrao.aliquotaIss) / 100,
              tomadorTipo: item.tomadorDocumento.length === 11 ? "cpf" : "cnpj",
              tomadorDocumento: item.tomadorDocumento,
              tomadorNome: item.tomadorNome,
              tomadorEmail: item.tomadorEmail,
              createdById: user.id,
            },
            select: { id: true },
          });

          await tx.nfseLoteItem.update({
            where: { id: item.id },
            data: {
              nfseAnteriorId: item.nfseId,
              nfseId: nova.id,
              status: "pendente",
              erro: null,
            },
          });
          novosItens.push({ itemId: item.id, nfseId: nova.id });
        }

        await tx.nfseLote.update({
          where: { id: loteId },
          data: { status: "processando", finalizadoEm: null },
        });
      },
      { timeout: 60_000 }
    );

    const queue = getNfeQueue();
    const jobs = await queue.addBulk(
      novosItens.map((i) => ({
        name: "emit-nfse",
        data: { nfseId: i.nfseId, clienteMeiId: lote.clienteMeiId },
      }))
    );
    await Promise.all(
      jobs.map((job, idx) =>
        prisma.nfseLoteItem.update({
          where: { id: novosItens[idx].itemId },
          data: { queueJobId: job.id ?? null },
        })
      )
    );

    await logAudit({
      action: "lote.reprocessado",
      resourceType: "nfse_lote",
      resourceId: loteId,
      actorId: user.id,
      actorLabel: user.email,
      details: { reprocessados: novosItens.length },
    });

    revalidatePath(`/nfse/lote/${loteId}`);
    return { success: true, data: { reprocessados: novosItens.length } };
  } catch (err) {
    console.error("[nfse-lote.reprocessarRejeitadas]", err);
    return { success: false, error: "Erro ao reprocessar" };
  }
}

export async function exportarResultadoCsv(
  loteId: string
): Promise<ActionResult<string>> {
  try {
    await requireRole("admin");
    const lote = await prisma.nfseLote.findUnique({
      where: { id: loteId },
      include: {
        itens: {
          orderBy: { linhaCsv: "asc" },
          include: {
            nfse: {
              select: {
                chaveAcesso: true,
                numeroNfse: true,
                mensagemResposta: true,
              },
            },
          },
        },
      },
    });
    if (!lote) return { success: false, error: "Lote não encontrado" };

    const header = [
      "linha",
      "status",
      "tomador_documento",
      "tomador_nome",
      "valor",
      "numero_nfse",
      "chave_acesso",
      "erro",
    ];

    const rows = lote.itens.map((it) => [
      String(it.linhaCsv),
      it.status,
      it.tomadorDocumento,
      escapeCsv(it.tomadorNome),
      it.valorServico.toString().replace(".", ","),
      it.nfse?.numeroNfse ?? "",
      it.nfse?.chaveAcesso ?? "",
      escapeCsv(it.erro ?? it.nfse?.mensagemResposta ?? ""),
    ]);

    const csv = [header.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
    // BOM UTF-8 para Excel BR
    return { success: true, data: "\uFEFF" + csv };
  } catch (err) {
    console.error("[nfse-lote.exportarResultadoCsv]", err);
    return { success: false, error: "Erro ao exportar resultado" };
  }
}

function escapeCsv(s: string): string {
  if (s.includes(";") || s.includes("\"") || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

