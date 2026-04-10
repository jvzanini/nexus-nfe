"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export interface ListAuditLogsInput {
  limit?: number;
  cursor?: string | null;
  resourceType?: string | null;
  actorId?: string | null;
}

export interface ActionResult<T> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Lista registros de audit log. Requer papel admin.
 */
export async function listAuditLogs(
  input: ListAuditLogsInput = {}
): Promise<
  ActionResult<{
    items: Array<{
      id: string;
      action: string;
      resourceType: string;
      resourceId: string | null;
      actorLabel: string;
      actorId: string | null;
      details: unknown;
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: Date;
    }>;
    nextCursor: string | null;
  }>
> {
  try {
    await requireRole("admin");

    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const where: Record<string, unknown> = {};
    if (input.resourceType) where.resourceType = input.resourceType;
    if (input.actorId) where.actorId = input.actorId;

    const items = await prisma.auditLog.findMany({
      where,
      take: limit + 1,
      ...(input.cursor
        ? { cursor: { id: input.cursor }, skip: 1 }
        : {}),
      orderBy: { createdAt: "desc" },
    });

    let nextCursor: string | null = null;
    if (items.length > limit) {
      const next = items.pop();
      nextCursor = next?.id ?? null;
    }

    return {
      success: true,
      data: {
        items: items.map((it) => ({
          id: it.id,
          action: it.action,
          resourceType: it.resourceType,
          resourceId: it.resourceId,
          actorLabel: it.actorLabel,
          actorId: it.actorId,
          details: it.details,
          ipAddress: it.ipAddress,
          userAgent: it.userAgent,
          createdAt: it.createdAt,
        })),
        nextCursor,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao listar audit logs",
    };
  }
}
