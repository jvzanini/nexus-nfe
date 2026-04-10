"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireRole } from "@/lib/auth";

export interface ActionResult<T> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Retorna o valor de uma global setting por chave, ou null se nao existir.
 */
export async function getSetting(
  key: string
): Promise<ActionResult<unknown | null>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Nao autenticado" };

    const row = await prisma.globalSettings.findUnique({ where: { key } });
    return { success: true, data: row?.value ?? null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao ler setting",
    };
  }
}

/**
 * Retorna todas as global settings como um mapa key -> value.
 */
export async function getAllSettings(): Promise<
  ActionResult<Record<string, unknown>>
> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Nao autenticado" };

    const rows = await prisma.globalSettings.findMany();
    const map: Record<string, unknown> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return { success: true, data: map };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao ler settings",
    };
  }
}

/**
 * Faz upsert de uma global setting. Requer super_admin.
 */
export async function updateSetting(
  key: string,
  value: unknown
): Promise<ActionResult<null>> {
  try {
    const user = await requireRole("super_admin");

    await prisma.globalSettings.upsert({
      where: { key },
      create: {
        key,
        value: value as object,
        updatedBy: user.id,
      },
      update: {
        value: value as object,
        updatedBy: user.id,
      },
    });

    return { success: true, data: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao gravar setting",
    };
  }
}
