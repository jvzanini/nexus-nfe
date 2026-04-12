"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type AmbienteNfse = "producao_restrita" | "producao";

/**
 * Retorna o ambiente atual de NFS-e da plataforma.
 */
export async function getAmbienteNfse(): Promise<ActionResult<{ ambiente: AmbienteNfse }>> {
  try {
    await requireRole("admin");

    // Lê do settings global, default é homologação
    const setting = await prisma.globalSettings.findUnique({
      where: { key: "AMBIENTE_NFSE" },
    });

    const ambiente = (setting?.value as AmbienteNfse) ?? "producao_restrita";
    return { success: true, data: { ambiente } };
  } catch (error) {
    console.error("[ambiente-nfse.getAmbienteNfse]", error);
    return { success: false, error: "Erro ao consultar ambiente" };
  }
}

/**
 * Altera o ambiente de NFS-e. Apenas super_admin.
 * Requer confirmação explícita para mudar para produção.
 */
export async function setAmbienteNfse(
  ambiente: AmbienteNfse,
  confirmar: boolean = false
): Promise<ActionResult> {
  try {
    await requireRole("super_admin");

    if (ambiente === "producao" && !confirmar) {
      return {
        success: false,
        error: "Mudança para produção requer confirmação explícita",
      };
    }

    await prisma.globalSettings.upsert({
      where: { key: "AMBIENTE_NFSE" },
      create: { key: "AMBIENTE_NFSE", value: ambiente },
      update: { value: ambiente },
    });

    return { success: true };
  } catch (error) {
    console.error("[ambiente-nfse.setAmbienteNfse]", error);
    return { success: false, error: "Erro ao alterar ambiente" };
  }
}
