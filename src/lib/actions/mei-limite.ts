"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { LIMITE_MEI_ANUAL_2026 } from "@/lib/nfse/constants";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface FaturamentoAnoData {
  ano: number;
  totalEmitido: number;
  quantidadeNotas: number;
  limite: number;
  percentual: number;
  faixa: "ok" | "atencao" | "alerta" | "bloqueado";
  mensagem: string;
}

/**
 * Retorna o faturamento do ano para um cliente MEI.
 * Calcula o percentual e a faixa de alerta.
 */
export async function getFaturamentoAno(
  clienteMeiId: string,
  ano?: number
): Promise<ActionResult<FaturamentoAnoData>> {
  try {
    await requireRole("admin");

    const anoAtual = ano ?? new Date().getFullYear();
    const limite = LIMITE_MEI_ANUAL_2026;

    // Busca ou cria o registro de faturamento anual
    const fat = await prisma.faturamentoAnual.upsert({
      where: {
        clienteMeiId_ano: { clienteMeiId, ano: anoAtual },
      },
      create: { clienteMeiId, ano: anoAtual },
      update: {},
    });

    const totalEmitido = Number(fat.totalEmitido);
    const percentual = limite > 0 ? (totalEmitido / limite) * 100 : 0;

    let faixa: FaturamentoAnoData["faixa"];
    let mensagem: string;

    if (percentual <= 80) {
      faixa = "ok";
      mensagem = `Faturamento dentro do limite (${percentual.toFixed(1)}%)`;
    } else if (percentual <= 100) {
      faixa = "atencao";
      mensagem = `Atenção: ${percentual.toFixed(1)}% do limite anual MEI atingido`;
    } else if (percentual <= 120) {
      faixa = "alerta";
      mensagem = `Alerta: faturamento excede o limite MEI em ${(percentual - 100).toFixed(1)}%. Dentro da tolerância de 20%, mas requer DAS complementar`;
    } else {
      faixa = "bloqueado";
      mensagem = `Bloqueado: faturamento excede 120% do limite MEI. Risco de desenquadramento retroativo`;
    }

    return {
      success: true,
      data: {
        ano: anoAtual,
        totalEmitido,
        quantidadeNotas: fat.quantidadeNotas,
        limite,
        percentual,
        faixa,
        mensagem,
      },
    };
  } catch (error) {
    console.error("[mei-limite.getFaturamentoAno]", error);
    return { success: false, error: "Erro ao consultar faturamento anual" };
  }
}

/**
 * Atualiza o faturamento após uma emissão autorizada.
 * Chamado pelo handler de emissão (fire-and-forget via outbox).
 */
export async function atualizarFaturamentoPos(
  clienteMeiId: string,
  valorEmitido: number
): Promise<ActionResult> {
  try {
    const anoAtual = new Date().getFullYear();
    const limite = LIMITE_MEI_ANUAL_2026;

    const fat = await prisma.faturamentoAnual.upsert({
      where: {
        clienteMeiId_ano: { clienteMeiId, ano: anoAtual },
      },
      create: {
        clienteMeiId,
        ano: anoAtual,
        totalEmitido: valorEmitido,
        quantidadeNotas: 1,
      },
      update: {
        totalEmitido: { increment: valorEmitido },
        quantidadeNotas: { increment: 1 },
      },
    });

    const totalAtualizado = Number(fat.totalEmitido);
    const percentual = (totalAtualizado / limite) * 100;

    // Marca como excedido se passar de 100%
    if (percentual > 100 && !fat.limiteExcedido) {
      await prisma.faturamentoAnual.update({
        where: { id: fat.id },
        data: { limiteExcedido: true },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("[mei-limite.atualizarFaturamentoPos]", error);
    return { success: false, error: "Erro ao atualizar faturamento" };
  }
}

export interface VerificacaoLimite {
  podeEmitir: boolean;
  percentualAtual: number;
  percentualAposEmissao: number;
  avisos: string[];
}

/**
 * Verifica se é possível emitir uma NFS-e com o valor informado.
 * Retorna avisos graduais e bloqueia acima de 120%.
 */
export async function verificarLimiteAntesDeEmitir(
  clienteMeiId: string,
  valorNovaEmissao: number
): Promise<ActionResult<VerificacaoLimite>> {
  try {
    await requireRole("admin");

    const anoAtual = new Date().getFullYear();
    const limite = LIMITE_MEI_ANUAL_2026;

    const fat = await prisma.faturamentoAnual.upsert({
      where: {
        clienteMeiId_ano: { clienteMeiId, ano: anoAtual },
      },
      create: { clienteMeiId, ano: anoAtual },
      update: {},
    });

    const totalAtual = Number(fat.totalEmitido);
    const totalApos = totalAtual + valorNovaEmissao;
    const percentualAtual = (totalAtual / limite) * 100;
    const percentualApos = (totalApos / limite) * 100;

    const avisos: string[] = [];
    let podeEmitir = true;

    if (percentualApos > 120) {
      podeEmitir = false;
      avisos.push(
        `Emissão bloqueada: faturamento atingiria ${percentualApos.toFixed(1)}% do limite MEI (R$ ${totalApos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de R$ ${limite.toLocaleString("pt-BR")}). Risco de desenquadramento retroativo.`
      );
    } else if (percentualApos > 100) {
      avisos.push(
        `Atenção: faturamento excederá o limite MEI (${percentualApos.toFixed(1)}%). Será necessário DAS complementar na DASN. Dentro da tolerância de 20%.`
      );
    } else if (percentualApos > 80) {
      avisos.push(
        `Aviso: faturamento atingirá ${percentualApos.toFixed(1)}% do limite anual MEI de R$ ${limite.toLocaleString("pt-BR")}.`
      );
    }

    return {
      success: true,
      data: {
        podeEmitir,
        percentualAtual,
        percentualAposEmissao: percentualApos,
        avisos,
      },
    };
  } catch (error) {
    console.error("[mei-limite.verificarLimiteAntesDeEmitir]", error);
    return { success: false, error: "Erro ao verificar limite MEI" };
  }
}
