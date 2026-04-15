import { prisma } from "@/lib/prisma";
import { getNfeQueue } from "@/lib/queue";
import { buildIdDps } from "@/lib/nfse/dps-id";
import { logAudit } from "@/lib/audit-log";
import {
  calcularProximaExecucao,
  deveEncerrar,
  type Frequencia,
} from "./proxima-execucao";

async function resolverAmbienteAtivo(): Promise<"producao" | "producao_restrita"> {
  try {
    const row = await prisma.globalSettings.findUnique({
      where: { key: "AMBIENTE_NFSE" },
    });
    return row?.value === "producao" ? "producao" : "producao_restrita";
  } catch {
    return "producao_restrita";
  }
}

/**
 * Executa 1 agendamento: cria Nfse rascunho + enfileira job + cria execução.
 * Retorna info de sucesso/erro.
 *
 * Se `manual=true`, NÃO atualiza `proximaExecucao` (disparo manual avulso).
 */
export async function executarAgendamento(
  agendamentoId: string,
  options: { manual?: boolean; actorId?: string | null } = {}
): Promise<{ success: boolean; nfseId?: string; error?: string }> {
  const agendamento = await prisma.nfseAgendamento.findUnique({
    where: { id: agendamentoId },
    include: {
      clienteMei: {
        include: {
          certificados: {
            where: { revoked: false },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });
  if (!agendamento) return { success: false, error: "Agendamento não encontrado" };

  if (agendamento.status !== "ativo" && !options.manual) {
    return { success: false, error: "Agendamento não está ativo" };
  }

  const cert = agendamento.clienteMei.certificados[0];
  if (!cert || cert.notAfter <= new Date()) {
    const msg = "Certificado A1 ausente ou expirado";
    await prisma.nfseAgendamentoExecucao.create({
      data: {
        agendamentoId: agendamento.id,
        sucesso: false,
        erro: msg,
      },
    });
    await prisma.nfseAgendamento.update({
      where: { id: agendamento.id },
      data: { lastError: msg, lastRunAt: new Date() },
    });
    return { success: false, error: msg };
  }

  const ambiente = await resolverAmbienteAtivo();

  // Reserva numeração
  const numResult = await prisma.$transaction(async (tx) => {
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
      WHERE id = ${agendamento.clienteMeiId}::uuid AND is_active = true
      FOR UPDATE
    `;
    if (rows.length === 0) throw new Error("Empresa inativa");
    const c = rows[0];
    const novoNumero = c.ultimo_numero_dps + 1;
    await tx.clienteMei.update({
      where: { id: agendamento.clienteMeiId },
      data: { ultimoNumeroDps: novoNumero },
    });
    const idDps = buildIdDps({
      codigoLocalEmissao: c.municipio_ibge,
      tipoInscricao: 1,
      inscricaoFederal: c.cnpj,
      serie: c.serie_dps_atual,
      numero: String(novoNumero),
    });
    return { serie: c.serie_dps_atual, numero: novoNumero, idDps };
  });

  const nfse = await prisma.nfse.create({
    data: {
      clienteMeiId: agendamento.clienteMeiId,
      ambiente,
      status: "pendente",
      idDps: numResult.idDps,
      serie: numResult.serie,
      numero: String(numResult.numero),
      dataEmissao: new Date(),
      dataCompetencia: new Date(),
      descricaoServico: agendamento.descricaoServico,
      codigoServico: agendamento.codigoTributacaoNacional,
      codigoNbs: agendamento.codigoNbs,
      localPrestacaoIbge: agendamento.localPrestacaoIbge,
      valorServico: agendamento.valorServico,
      aliquotaIss: agendamento.aliquotaIss,
      valorIss:
        (Number(agendamento.valorServico) * Number(agendamento.aliquotaIss)) /
        100,
      tomadorTipo: agendamento.tomadorTipo,
      tomadorDocumento: agendamento.tomadorDocumento,
      tomadorNome: agendamento.tomadorNome,
      tomadorEmail: agendamento.tomadorEmail,
      tomadorEndereco: agendamento.tomadorEndereco as any,
      createdById: agendamento.createdById,
    },
    select: { id: true },
  });

  await prisma.nfseAgendamentoExecucao.create({
    data: {
      agendamentoId: agendamento.id,
      nfseId: nfse.id,
      sucesso: true,
    },
  });

  const queue = getNfeQueue();
  await queue.add("emit-nfse", {
    nfseId: nfse.id,
    clienteMeiId: agendamento.clienteMeiId,
  });

  // Atualiza agendamento
  if (!options.manual) {
    const proximaBase = agendamento.proximaExecucao;
    const proxima = calcularProximaExecucao(
      proximaBase,
      agendamento.frequencia as Frequencia,
      agendamento.diaMes
    );
    const novoTotal = agendamento.totalExecucoes + 1;
    const encerrar = deveEncerrar(
      proxima,
      agendamento.dataFinal,
      novoTotal,
      agendamento.maxExecucoes
    );
    await prisma.nfseAgendamento.update({
      where: { id: agendamento.id },
      data: {
        totalExecucoes: novoTotal,
        lastRunAt: new Date(),
        lastError: null,
        proximaExecucao: proxima ?? agendamento.proximaExecucao,
        status: encerrar ? "encerrado" : agendamento.status,
      },
    });
  } else {
    await prisma.nfseAgendamento.update({
      where: { id: agendamento.id },
      data: { lastRunAt: new Date(), lastError: null },
    });
  }

  await logAudit({
    action: options.manual ? "agendamento.executado_manual" : "agendamento.executado_auto",
    resourceType: "nfse_agendamento",
    resourceId: agendamento.id,
    actorId: options.actorId ?? null,
    actorType: options.manual ? "user" : "system",
    actorLabel: options.manual ? (options.actorId ? "user" : "system") : "system",
    details: { nfseId: nfse.id },
  });

  return { success: true, nfseId: nfse.id };
}

/**
 * Processa todos os agendamentos com proximaExecucao <= agora e status=ativo.
 * Retorna estatísticas.
 */
export async function tickAgendamentos(): Promise<{
  processados: number;
  sucesso: number;
  erro: number;
}> {
  const agora = new Date();
  const pending = await prisma.nfseAgendamento.findMany({
    where: {
      status: "ativo",
      proximaExecucao: { lte: agora },
    },
    select: { id: true },
    take: 100,
  });

  let sucesso = 0;
  let erro = 0;
  for (const a of pending) {
    try {
      const r = await executarAgendamento(a.id);
      if (r.success) sucesso++;
      else erro++;
    } catch (err) {
      console.error("[agendamento-tick]", a.id, err);
      erro++;
      await prisma.nfseAgendamento.update({
        where: { id: a.id },
        data: {
          lastError: err instanceof Error ? err.message : String(err),
          lastRunAt: new Date(),
        },
      }).catch(() => {});
    }
  }
  return { processados: pending.length, sucesso, erro };
}
