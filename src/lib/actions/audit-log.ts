"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export interface ListAuditLogsInput {
  limit?: number;
  cursor?: string | null;
  resourceType?: string | null;
  actorId?: string | null;
  action?: string | null;
  dataInicio?: string | null; // YYYY-MM-DD
  dataFim?: string | null;
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
    if (input.action) where.action = input.action;
    if (input.dataInicio || input.dataFim) {
      where.createdAt = {
        ...(input.dataInicio ? { gte: new Date(input.dataInicio) } : {}),
        ...(input.dataFim ? { lte: new Date(input.dataFim + "T23:59:59Z") } : {}),
      };
    }

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

/**
 * Retorna lista distinta de tipos de recurso e ações presentes nos logs,
 * pra popular filtros da UI.
 */
export async function getAuditFacets(): Promise<
  ActionResult<{ resourceTypes: string[]; actions: string[]; actors: Array<{ id: string; label: string }> }>
> {
  try {
    await requireRole("admin");
    const [resourceTypes, actions, actors] = await Promise.all([
      prisma.auditLog.findMany({ select: { resourceType: true }, distinct: ["resourceType"] }),
      prisma.auditLog.findMany({ select: { action: true }, distinct: ["action"] }),
      prisma.auditLog.findMany({
        where: { actorId: { not: null } },
        select: { actorId: true, actorLabel: true },
        distinct: ["actorId"],
        take: 100,
      }),
    ]);
    return {
      success: true,
      data: {
        resourceTypes: resourceTypes.map((r) => r.resourceType).sort(),
        actions: actions.map((a) => a.action).sort(),
        actors: actors
          .filter((a): a is { actorId: string; actorLabel: string } => !!a.actorId)
          .map((a) => ({ id: a.actorId, label: a.actorLabel })),
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro" };
  }
}

/**
 * Exporta logs de auditoria como CSV (UTF-8 BOM + separador ;).
 */
export async function exportAuditLogsCsv(
  input: ListAuditLogsInput = {}
): Promise<ActionResult<string>> {
  try {
    await requireRole("admin");
    const where: Record<string, unknown> = {};
    if (input.resourceType) where.resourceType = input.resourceType;
    if (input.actorId) where.actorId = input.actorId;
    if (input.action) where.action = input.action;
    if (input.dataInicio || input.dataFim) {
      where.createdAt = {
        ...(input.dataInicio ? { gte: new Date(input.dataInicio) } : {}),
        ...(input.dataFim ? { lte: new Date(input.dataFim + "T23:59:59Z") } : {}),
      };
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    const escape = (v: string) =>
      /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

    const fmtDate = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    const headers = [
      "Data",
      "Ator",
      "Ação",
      "Tipo de Recurso",
      "ID do Recurso",
      "IP",
      "User-Agent",
      "Detalhes",
    ];
    const rows = logs.map((l) =>
      [
        fmtDate(l.createdAt),
        l.actorLabel,
        l.action,
        l.resourceType,
        l.resourceId ?? "",
        l.ipAddress ?? "",
        l.userAgent ?? "",
        JSON.stringify(l.details),
      ]
        .map(escape)
        .join(";")
    );

    const csv = "\uFEFF" + headers.join(";") + "\n" + rows.join("\n");
    return { success: true, data: csv };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro" };
  }
}
