"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import {
  createClienteMeiSchema,
  updateClienteMeiSchema,
  cnpjSchema,
  type CreateClienteMeiInput,
  type UpdateClienteMeiInput,
} from "@/lib/validation/cliente-mei";

export interface ClienteMeiListItem {
  id: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  logoUrl: string | null;
  email: string | null;
  municipioIbge: string;
  uf: string;
  serieDpsAtual: string;
  ultimoNumeroDps: number;
  isActive: boolean;
  createdAt: Date;
  certificadoValido: boolean;
  certificadoExpiraEm: Date | null;
  totalNfses: number;
}

export interface ClienteMeiDetail extends ClienteMeiListItem {
  inscricaoMunicipal: string | null;
  telefone: string | null;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  codigoServicoPadrao: string | null;
  updatedAt: Date;
}

export interface BrasilApiCnpjResponse {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  email: string | null;
  ddd_telefone_1: string | null;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  municipio: string;
  codigo_municipio_ibge: number;
  uf: string;
}

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Lista todos os clientes MEI. Admin+.
 */
export async function listClientesMei(): Promise<
  ActionResult<ClienteMeiListItem[]>
> {
  try {
    await requireRole("admin");

    const clientes = await prisma.clienteMei.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { nfses: true } },
        certificados: {
          where: { revoked: false },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { notAfter: true },
        },
      },
    });

    const now = new Date();
    const data: ClienteMeiListItem[] = clientes.map((c) => {
      const cert = c.certificados[0] ?? null;
      return {
        id: c.id,
        cnpj: c.cnpj,
        razaoSocial: c.razaoSocial,
        nomeFantasia: c.nomeFantasia,
        logoUrl: c.logoUrl,
        email: c.email,
        municipioIbge: c.municipioIbge,
        uf: c.uf,
        serieDpsAtual: c.serieDpsAtual,
        ultimoNumeroDps: c.ultimoNumeroDps,
        isActive: c.isActive,
        createdAt: c.createdAt,
        certificadoValido: cert ? cert.notAfter > now : false,
        certificadoExpiraEm: cert?.notAfter ?? null,
        totalNfses: c._count.nfses,
      };
    });

    return { success: true, data };
  } catch (error) {
    console.error("[clientes-mei.listClientesMei]", error);
    return { success: false, error: "Erro ao listar clientes MEI" };
  }
}

/**
 * Retorna detalhes completos de um cliente MEI.
 */
export async function getClienteMei(
  id: string
): Promise<ActionResult<ClienteMeiDetail>> {
  try {
    await requireRole("admin");

    const c = await prisma.clienteMei.findUnique({
      where: { id },
      include: {
        _count: { select: { nfses: true } },
        certificados: {
          where: { revoked: false },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { notAfter: true },
        },
      },
    });

    if (!c) return { success: false, error: "Cliente não encontrado" };

    const cert = c.certificados[0] ?? null;
    const now = new Date();

    return {
      success: true,
      data: {
        id: c.id,
        cnpj: c.cnpj,
        razaoSocial: c.razaoSocial,
        nomeFantasia: c.nomeFantasia,
        logoUrl: c.logoUrl,
        inscricaoMunicipal: c.inscricaoMunicipal,
        email: c.email,
        telefone: c.telefone,
        cep: c.cep,
        logradouro: c.logradouro,
        numero: c.numero,
        complemento: c.complemento,
        bairro: c.bairro,
        municipioIbge: c.municipioIbge,
        uf: c.uf,
        codigoServicoPadrao: c.codigoServicoPadrao,
        serieDpsAtual: c.serieDpsAtual,
        ultimoNumeroDps: c.ultimoNumeroDps,
        isActive: c.isActive,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        certificadoValido: cert ? cert.notAfter > now : false,
        certificadoExpiraEm: cert?.notAfter ?? null,
        totalNfses: c._count.nfses,
      },
    };
  } catch (error) {
    console.error("[clientes-mei.getClienteMei]", error);
    return { success: false, error: "Erro ao carregar cliente" };
  }
}

/**
 * Cria um novo cliente MEI.
 */
export async function createClienteMei(
  input: CreateClienteMeiInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const currentUser = await requireRole("admin");

    const parsed = createClienteMeiSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const data = parsed.data;

    const existing = await prisma.clienteMei.findUnique({
      where: { cnpj: data.cnpj },
      select: { id: true },
    });
    if (existing) {
      return { success: false, error: "CNPJ já cadastrado" };
    }

    const created = await prisma.clienteMei.create({
      data: {
        ...data,
        createdById: currentUser.id,
      },
      select: { id: true },
    });

    revalidatePath("/clientes");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    console.error("[clientes-mei.createClienteMei]", error);
    return { success: false, error: "Erro ao cadastrar cliente" };
  }
}

/**
 * Atualiza um cliente MEI existente.
 */
export async function updateClienteMei(
  id: string,
  input: UpdateClienteMeiInput
): Promise<ActionResult> {
  try {
    await requireRole("admin");

    const parsed = updateClienteMeiSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const target = await prisma.clienteMei.findUnique({
      where: { id },
      select: { id: true, cnpj: true },
    });
    if (!target) {
      return { success: false, error: "Cliente não encontrado" };
    }

    const data = parsed.data;

    if (data.cnpj && data.cnpj !== target.cnpj) {
      const clash = await prisma.clienteMei.findFirst({
        where: { cnpj: data.cnpj, id: { not: id } },
        select: { id: true },
      });
      if (clash) return { success: false, error: "CNPJ já cadastrado" };
    }

    await prisma.clienteMei.update({
      where: { id },
      data,
    });

    revalidatePath("/clientes");
    revalidatePath(`/clientes/${id}`);
    return { success: true };
  } catch (error) {
    console.error("[clientes-mei.updateClienteMei]", error);
    return { success: false, error: "Erro ao atualizar cliente" };
  }
}

/**
 * Soft delete de cliente MEI: marca como inativo. Não apaga histórico.
 */
export async function deleteClienteMei(id: string): Promise<ActionResult> {
  try {
    await requireRole("admin");

    const target = await prisma.clienteMei.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });
    if (!target) return { success: false, error: "Cliente não encontrado" };

    await prisma.clienteMei.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath("/clientes");
    return { success: true };
  } catch (error) {
    console.error("[clientes-mei.deleteClienteMei]", error);
    return { success: false, error: "Erro ao excluir cliente" };
  }
}

/**
 * Consulta dados públicos de um CNPJ na BrasilAPI para auto-preenchimento.
 * Fallback pra erro genérico — UI deve permitir digitação manual.
 */
export async function fetchCnpjBrasilApi(
  cnpj: string
): Promise<ActionResult<BrasilApiCnpjResponse>> {
  try {
    await requireRole("admin");

    const parsed = cnpjSchema.safeParse(cnpj);
    if (!parsed.success) {
      return { success: false, error: "CNPJ inválido" };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    // BrasilAPI passa por Cloudflare e bloqueia User-Agent default do Node
    // (403). Um UA custom identificável resolve.
    const res = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${parsed.data}`,
      {
        signal: controller.signal,
        cache: "no-store",
        headers: {
          "User-Agent": "nexus-nfe/1.0 (+https://nexusai360.com)",
          Accept: "application/json",
        },
      }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      if (res.status === 404) {
        return { success: false, error: "CNPJ não encontrado na Receita" };
      }
      return {
        success: false,
        error: `Erro BrasilAPI (${res.status}) — preencha manualmente`,
      };
    }

    const json = (await res.json()) as BrasilApiCnpjResponse;
    return { success: true, data: json };
  } catch (error) {
    const msg =
      error instanceof Error && error.name === "AbortError"
        ? "BrasilAPI indisponível — preencha manualmente"
        : "Falha ao consultar BrasilAPI — preencha manualmente";
    console.error("[clientes-mei.fetchCnpjBrasilApi]", error);
    return { success: false, error: msg };
  }
}
