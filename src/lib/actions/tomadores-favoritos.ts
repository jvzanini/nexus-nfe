"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface ImportCsvPreview {
  totalLinhas: number;
  validos: Array<{ tipo: "cpf" | "cnpj"; documento: string; nome: string; email: string | null; linha: number }>;
  invalidos: Array<{ linha: number; motivo: string; raw: string }>;
  duplicadosPlanilha: number;
  jaExistentes: number;
}

export interface ImportCsvResult {
  criados: number;
  atualizados: number;
  ignorados: number;
}

export interface TomadorFavoritoItem {
  id: string;
  tipo: string;
  documento: string;
  nome: string;
  email: string | null;
  endereco: Record<string, string> | null;
  usoCount: number;
  ultimoUso: Date | null;
  grupoId: string | null;
  grupoNome: string | null;
}

/**
 * Lista tomadores favoritos de um cliente, ordenados por último uso.
 */
export async function listarTomadoresFavoritos(
  clienteMeiId: string
): Promise<ActionResult<TomadorFavoritoItem[]>> {
  try {
    await requireRole("admin");

    const tomadores = await prisma.tomadorFavorito.findMany({
      where: { clienteMeiId },
      orderBy: { ultimoUso: { sort: "desc", nulls: "last" } },
      take: 50,
      include: { grupo: { select: { id: true, nome: true } } },
    });

    const data: TomadorFavoritoItem[] = tomadores.map((t) => ({
      id: t.id,
      tipo: t.tipo,
      documento: t.documento,
      nome: t.nome,
      email: t.email,
      endereco: t.endereco as Record<string, string> | null,
      usoCount: t.usoCount,
      ultimoUso: t.ultimoUso,
      grupoId: t.grupoId,
      grupoNome: t.grupo?.nome ?? null,
    }));

    return { success: true, data };
  } catch (error) {
    console.error("[tomadores-favoritos.listar]", error);
    return { success: false, error: "Erro ao listar tomadores favoritos" };
  }
}

/**
 * Salva ou atualiza um tomador favorito. Upsert por [clienteMeiId, documento].
 */
export async function salvarTomadorFavorito(input: {
  clienteMeiId: string;
  tipo: string;
  documento: string;
  nome: string;
  email?: string;
  endereco?: Record<string, string>;
}): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole("admin");

    const result = await prisma.tomadorFavorito.upsert({
      where: {
        clienteMeiId_documento: {
          clienteMeiId: input.clienteMeiId,
          documento: input.documento,
        },
      },
      create: {
        clienteMeiId: input.clienteMeiId,
        tipo: input.tipo,
        documento: input.documento,
        nome: input.nome,
        email: input.email ?? null,
        endereco: input.endereco ?? undefined,
      },
      update: {
        tipo: input.tipo,
        nome: input.nome,
        email: input.email ?? null,
        endereco: input.endereco ?? undefined,
      },
      select: { id: true },
    });

    return { success: true, data: { id: result.id } };
  } catch (error) {
    console.error("[tomadores-favoritos.salvar]", error);
    return { success: false, error: "Erro ao salvar tomador favorito" };
  }
}

/**
 * Incrementa usoCount e atualiza ultimoUso.
 */
export async function registrarUsoTomador(id: string): Promise<ActionResult> {
  try {
    await requireRole("admin");

    await prisma.tomadorFavorito.update({
      where: { id },
      data: {
        usoCount: { increment: 1 },
        ultimoUso: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[tomadores-favoritos.registrarUso]", error);
    return { success: false, error: "Erro ao registrar uso" };
  }
}

/**
 * Atualiza nome e/ou email de um tomador favorito.
 */
export async function atualizarTomadorFavorito(
  id: string,
  input: { nome: string; email?: string }
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole("admin");

    const result = await prisma.tomadorFavorito.update({
      where: { id },
      data: {
        nome: input.nome,
        email: input.email ?? null,
      },
      select: { id: true },
    });

    return { success: true, data: { id: result.id } };
  } catch (error) {
    console.error("[tomadores-favoritos.atualizar]", error);
    return { success: false, error: "Erro ao atualizar tomador favorito" };
  }
}

/**
 * Remove um tomador favorito.
 */
export async function excluirTomadorFavorito(id: string): Promise<ActionResult> {
  try {
    await requireRole("admin");
    await prisma.tomadorFavorito.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    console.error("[tomadores-favoritos.excluir]", error);
    return { success: false, error: "Erro ao excluir tomador favorito" };
  }
}

// ============================================================
// Importação em massa via CSV
// ============================================================

function onlyDigits(v: string): string {
  return v.replace(/\D/g, "");
}

function isValidCpf(cpf: string): boolean {
  const c = onlyDigits(cpf);
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(c[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
}

function isValidCnpj(cnpj: string): boolean {
  const c = onlyDigits(cnpj);
  if (c.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(c)) return false;
  const calc = (len: number) => {
    let sum = 0;
    let pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += Number(c[len - i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ";" || ch === ",") {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Faz preview de CSV: valida cada linha, identifica duplicados (dentro da
 * planilha e com base existente), e retorna resumo para o usuário confirmar.
 * Não persiste nada.
 *
 * Formato aceito: cabeçalho com colunas `documento` e `nome` obrigatórias,
 * `email` opcional. Separador `;` ou `,`.
 */
export async function previewImportTomadoresCsv(
  clienteMeiId: string,
  csvText: string
): Promise<ActionResult<ImportCsvPreview>> {
  try {
    await requireRole("admin");

    const lines = csvText
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0);

    if (lines.length < 2) {
      return { success: false, error: "CSV vazio ou sem dados além do cabeçalho" };
    }

    const header = parseCsvLine(lines[0]).map(normalizeHeader);
    const idxDoc = header.indexOf("documento");
    const idxNome = header.indexOf("nome");
    const idxEmail = header.indexOf("email");

    if (idxDoc === -1 || idxNome === -1) {
      return {
        success: false,
        error: "CSV precisa ter colunas 'documento' e 'nome' no cabeçalho",
      };
    }

    const validos: ImportCsvPreview["validos"] = [];
    const invalidos: ImportCsvPreview["invalidos"] = [];
    const docsVistos = new Set<string>();
    let duplicadosPlanilha = 0;

    for (let i = 1; i < lines.length; i++) {
      const fields = parseCsvLine(lines[i]);
      const documento = onlyDigits(fields[idxDoc] ?? "");
      const nome = (fields[idxNome] ?? "").trim();
      const email = idxEmail >= 0 ? (fields[idxEmail] ?? "").trim() : "";

      const linhaHumano = i + 1;

      if (!documento) {
        invalidos.push({ linha: linhaHumano, motivo: "Documento vazio", raw: lines[i] });
        continue;
      }
      if (!nome) {
        invalidos.push({ linha: linhaHumano, motivo: "Nome vazio", raw: lines[i] });
        continue;
      }
      let tipo: "cpf" | "cnpj";
      if (documento.length === 11) {
        if (!isValidCpf(documento)) {
          invalidos.push({ linha: linhaHumano, motivo: "CPF inválido", raw: lines[i] });
          continue;
        }
        tipo = "cpf";
      } else if (documento.length === 14) {
        if (!isValidCnpj(documento)) {
          invalidos.push({ linha: linhaHumano, motivo: "CNPJ inválido", raw: lines[i] });
          continue;
        }
        tipo = "cnpj";
      } else {
        invalidos.push({
          linha: linhaHumano,
          motivo: `Documento com ${documento.length} dígitos (esperado 11 ou 14)`,
          raw: lines[i],
        });
        continue;
      }

      if (docsVistos.has(documento)) {
        duplicadosPlanilha++;
        continue;
      }
      docsVistos.add(documento);

      validos.push({
        tipo,
        documento,
        nome,
        email: email || null,
        linha: linhaHumano,
      });
    }

    const existentes = await prisma.tomadorFavorito.findMany({
      where: {
        clienteMeiId,
        documento: { in: Array.from(docsVistos) },
      },
      select: { documento: true },
    });
    const setExistentes = new Set(existentes.map((e) => e.documento));
    const jaExistentes = validos.filter((v) => setExistentes.has(v.documento)).length;

    return {
      success: true,
      data: {
        totalLinhas: lines.length - 1,
        validos,
        invalidos,
        duplicadosPlanilha,
        jaExistentes,
      },
    };
  } catch (error) {
    console.error("[tomadores-favoritos.previewImportCsv]", error);
    return { success: false, error: "Erro ao analisar CSV" };
  }
}

/**
 * Executa a importação após preview. Faz upsert por documento (linhas
 * existentes têm nome/email atualizados).
 */
export async function importarTomadoresCsv(
  clienteMeiId: string,
  csvText: string
): Promise<ActionResult<ImportCsvResult>> {
  try {
    await requireRole("admin");

    const preview = await previewImportTomadoresCsv(clienteMeiId, csvText);
    if (!preview.success || !preview.data) {
      return { success: false, error: preview.error };
    }

    let criados = 0;
    let atualizados = 0;

    for (const v of preview.data.validos) {
      try {
        const existing = await prisma.tomadorFavorito.findUnique({
          where: {
            clienteMeiId_documento: { clienteMeiId, documento: v.documento },
          },
          select: { id: true },
        });
        await prisma.tomadorFavorito.upsert({
          where: {
            clienteMeiId_documento: { clienteMeiId, documento: v.documento },
          },
          create: {
            clienteMeiId,
            tipo: v.tipo,
            documento: v.documento,
            nome: v.nome,
            email: v.email,
          },
          update: {
            tipo: v.tipo,
            nome: v.nome,
            email: v.email,
          },
        });
        if (existing) atualizados++;
        else criados++;
      } catch (err) {
        console.error("[tomadores-favoritos.importarCsv] upsert falhou", err);
      }
    }

    return {
      success: true,
      data: {
        criados,
        atualizados,
        ignorados: preview.data.invalidos.length + preview.data.duplicadosPlanilha,
      },
    };
  } catch (error) {
    console.error("[tomadores-favoritos.importarCsv]", error);
    return { success: false, error: "Erro ao importar CSV" };
  }
}
