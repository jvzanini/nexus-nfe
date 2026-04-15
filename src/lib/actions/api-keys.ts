"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const SETTING_KEY = "API_KEYS";
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

export interface ApiKeyRecord {
  key: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string | null;
  createdBy?: string | null;
}

export interface MaskedApiKey {
  preview: string; // "nxnfe_...abcd"
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  createdBy: string | null;
}

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

function mask(key: string): string {
  if (key.length < 12) return key;
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

async function readKeys(): Promise<ApiKeyRecord[]> {
  const setting = await prisma.globalSettings.findUnique({
    where: { key: SETTING_KEY },
  });
  if (!setting?.value) return [];
  try {
    return JSON.parse(String(setting.value)) as ApiKeyRecord[];
  } catch {
    return [];
  }
}

async function writeKeys(keys: ApiKeyRecord[], updatedBy: string) {
  await prisma.globalSettings.upsert({
    where: { key: SETTING_KEY },
    create: {
      key: SETTING_KEY,
      value: JSON.stringify(keys),
      updatedBy,
    },
    update: { value: JSON.stringify(keys), updatedBy },
  });
}

export async function listApiKeys(): Promise<ActionResult<MaskedApiKey[]>> {
  try {
    await requireRole("super_admin");
    const keys = await readKeys();
    return {
      success: true,
      data: keys.map((k) => ({
        preview: mask(k.key),
        name: k.name,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt ?? null,
        createdBy: k.createdBy ?? null,
      })),
    };
  } catch (err) {
    console.error("[api-keys.list]", err);
    return { success: false, error: "Erro ao listar API keys" };
  }
}

export async function criarApiKey(
  name: string
): Promise<ActionResult<{ key: string }>> {
  try {
    const user = await requireRole("super_admin");
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: "Nome obrigatório" };
    if (trimmed.length > 80)
      return { success: false, error: "Nome muito longo (máx 80)" };

    const keys = await readKeys();
    if (keys.some((k) => k.name === trimmed)) {
      return { success: false, error: "Já existe uma API key com esse nome" };
    }

    const key = `nxnfe_${randomBytes(32).toString("hex")}`;
    keys.push({
      key,
      name: trimmed,
      createdAt: new Date().toISOString(),
      createdBy: user.name || user.email,
    });
    await writeKeys(keys, user.id || SYSTEM_USER_ID);
    revalidatePath("/settings");
    return { success: true, data: { key } };
  } catch (err) {
    console.error("[api-keys.criar]", err);
    return { success: false, error: "Erro ao criar API key" };
  }
}

export async function revogarApiKey(
  preview: string
): Promise<ActionResult> {
  try {
    const user = await requireRole("super_admin");
    const keys = await readKeys();
    const remaining = keys.filter((k) => mask(k.key) !== preview);
    if (remaining.length === keys.length) {
      return { success: false, error: "API key não encontrada" };
    }
    await writeKeys(remaining, user.id || SYSTEM_USER_ID);
    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    console.error("[api-keys.revogar]", err);
    return { success: false, error: "Erro ao revogar API key" };
  }
}
