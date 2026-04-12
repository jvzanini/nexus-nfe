import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export interface ApiKeyInfo {
  key: string;
  name: string;
  createdAt: string;
}

/**
 * Valida API Key do header X-API-Key.
 * Retorna a info da key se válida, ou null.
 */
export async function validateApiKey(request: NextRequest): Promise<ApiKeyInfo | null> {
  const apiKey = request.headers.get("X-API-Key");
  if (!apiKey) return null;

  try {
    const setting = await prisma.globalSettings.findUnique({
      where: { key: "API_KEYS" },
    });

    if (!setting?.value) return null;

    const keys: ApiKeyInfo[] = JSON.parse(setting.value);
    return keys.find((k) => k.key === apiKey) ?? null;
  } catch {
    return null;
  }
}

/**
 * Middleware helper: valida API Key ou retorna 401.
 * Usar no início de cada route handler.
 */
export async function requireApiKey(request: NextRequest): Promise<ApiKeyInfo> {
  const info = await validateApiKey(request);
  if (!info) {
    throw new ApiError(401, "API Key inválida ou não fornecida. Envie no header X-API-Key.");
  }
  return info;
}

export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}
