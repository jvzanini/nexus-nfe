"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { buildIdDps } from "@/lib/nfse/dps-id";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface NumeracaoDps {
  serie: string;
  numero: number;
  idDps: string;
}

/**
 * Reserva o próximo número de DPS para um cliente MEI.
 * Usa transação com SELECT FOR UPDATE para evitar race conditions.
 */
export async function reservarProximoNumeroDps(
  clienteMeiId: string
): Promise<ActionResult<NumeracaoDps>> {
  try {
    await requireRole("admin");

    const result = await prisma.$transaction(async (tx) => {
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

      if (rows.length === 0) {
        throw new Error("Cliente MEI não encontrado ou inativo");
      }

      const cliente = rows[0];
      const novoNumero = cliente.ultimo_numero_dps + 1;

      await tx.clienteMei.update({
        where: { id: clienteMeiId },
        data: { ultimoNumeroDps: novoNumero },
      });

      const idDps = buildIdDps({
        codigoLocalEmissao: cliente.municipio_ibge,
        tipoInscricao: 1,
        inscricaoFederal: cliente.cnpj,
        serie: cliente.serie_dps_atual,
        numero: String(novoNumero),
      });

      return {
        serie: cliente.serie_dps_atual,
        numero: novoNumero,
        idDps,
      };
    });

    return { success: true, data: result };
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Erro ao reservar número DPS";
    console.error("[dps-numeracao.reservarProximoNumeroDps]", error);
    return { success: false, error: msg };
  }
}
