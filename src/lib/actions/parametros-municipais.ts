"use server";

import { requireRole } from "@/lib/auth";
import {
  getConvenioMunicipal,
  getParametrosServico,
  type ConvenioMunicipal,
  type ParametrosServico,
} from "@/lib/nfse/parametros-municipais";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function fetchConvenioMunicipal(
  codigoMunicipio: string
): Promise<ActionResult<ConvenioMunicipal>> {
  try {
    await requireRole("admin");

    if (!/^\d{7}$/.test(codigoMunicipio)) {
      return { success: false, error: "Código IBGE deve ter 7 dígitos" };
    }

    const data = await getConvenioMunicipal(codigoMunicipio);
    if (!data) {
      return {
        success: false,
        error: "Município não encontrado ou não aderiu ao convênio",
      };
    }

    return { success: true, data };
  } catch (error) {
    console.error("[parametros-municipais.fetchConvenioMunicipal]", error);
    return { success: false, error: "Erro ao consultar convênio municipal" };
  }
}

export async function fetchParametrosServico(
  codigoMunicipio: string,
  codigoServico: string
): Promise<ActionResult<ParametrosServico>> {
  try {
    await requireRole("admin");

    if (!/^\d{7}$/.test(codigoMunicipio)) {
      return { success: false, error: "Código IBGE deve ter 7 dígitos" };
    }
    if (!/^\d{6}$/.test(codigoServico)) {
      return { success: false, error: "Código de serviço deve ter 6 dígitos" };
    }

    const data = await getParametrosServico(codigoMunicipio, codigoServico);
    if (!data) {
      return {
        success: false,
        error: "Parâmetros não encontrados para este serviço/município",
      };
    }

    return { success: true, data };
  } catch (error) {
    console.error("[parametros-municipais.fetchParametrosServico]", error);
    return { success: false, error: "Erro ao consultar parâmetros do serviço" };
  }
}
