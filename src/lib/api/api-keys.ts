import { prisma } from "@/lib/prisma";
import { randomBytes } from "node:crypto";
import type { ApiKeyInfo } from "./auth";

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Gera uma nova API Key e salva no banco.
 */
export async function createApiKey(name: string): Promise<ApiKeyInfo> {
  const key = `nxnfe_${randomBytes(32).toString("hex")}`;
  const newKey: ApiKeyInfo = {
    key,
    name,
    createdAt: new Date().toISOString(),
  };

  const setting = await prisma.globalSettings.findUnique({
    where: { key: "API_KEYS" },
  });

  const existing: ApiKeyInfo[] = setting?.value
    ? JSON.parse(String(setting.value))
    : [];

  existing.push(newKey);

  await prisma.globalSettings.upsert({
    where: { key: "API_KEYS" },
    create: { key: "API_KEYS", value: JSON.stringify(existing), updatedBy: SYSTEM_USER_ID },
    update: { value: JSON.stringify(existing) },
  });

  return newKey;
}

/**
 * Lista todas as API Keys (mascarando os valores).
 */
export async function listApiKeys(): Promise<Array<{ name: string; keyPreview: string; createdAt: string }>> {
  const setting = await prisma.globalSettings.findUnique({
    where: { key: "API_KEYS" },
  });

  if (!setting?.value) return [];

  const keys: ApiKeyInfo[] = JSON.parse(String(setting.value));
  return keys.map((k) => ({
    name: k.name,
    keyPreview: k.key.slice(0, 10) + "..." + k.key.slice(-4),
    createdAt: k.createdAt,
  }));
}

/**
 * Revoga uma API Key pelo nome.
 */
export async function revokeApiKey(name: string): Promise<boolean> {
  const setting = await prisma.globalSettings.findUnique({
    where: { key: "API_KEYS" },
  });

  if (!setting?.value) return false;

  const keys: ApiKeyInfo[] = JSON.parse(String(setting.value));
  const filtered = keys.filter((k) => k.name !== name);

  if (filtered.length === keys.length) return false;

  await prisma.globalSettings.update({
    where: { key: "API_KEYS" },
    data: { value: JSON.stringify(filtered) },
  });

  return true;
}
