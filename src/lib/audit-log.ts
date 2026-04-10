import { prisma } from "@/lib/prisma";

export interface LogAuditInput {
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, unknown>;
  actorId?: string | null;
  actorLabel?: string;
  actorType?: "user" | "system";
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Registra um evento de auditoria de forma fire-and-forget.
 * Nunca lanca: em caso de erro apenas loga no console.
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorType: input.actorType ?? (input.actorId ? "user" : "system"),
        actorId: input.actorId ?? null,
        actorLabel: input.actorLabel ?? (input.actorId ? "user" : "system"),
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        details: (input.details ?? {}) as object,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (err) {
    console.error("[audit-log] failed to persist audit event", err);
  }
}

/**
 * Wrapper que executa uma funcao e registra o resultado em audit log automaticamente.
 * Se a funcao lancar, o erro e registrado como `details.error` e re-lancado.
 */
export async function withAudit<T>(
  fn: () => Promise<T>,
  opts: Omit<LogAuditInput, "details"> & {
    details?: Record<string, unknown>;
  }
): Promise<T> {
  try {
    const result = await fn();
    await logAudit({
      ...opts,
      details: {
        ...(opts.details ?? {}),
        success: true,
      },
    });
    return result;
  } catch (err) {
    await logAudit({
      ...opts,
      action: opts.action,
      details: {
        ...(opts.details ?? {}),
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}
