"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export interface ActionResult<T> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface NotificationItem {
  id: string;
  type: "error" | "warning" | "info";
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: Date;
}

/**
 * Lista notificacoes do usuario autenticado (mais recentes primeiro).
 */
export async function listMyNotifications(
  input: { limit?: number } = {}
): Promise<ActionResult<NotificationItem[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Nao autenticado" };

    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);

    const rows = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return {
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        type: r.type as "error" | "warning" | "info",
        title: r.title,
        message: r.message,
        link: r.link,
        isRead: r.isRead,
        createdAt: r.createdAt,
      })),
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Erro ao listar notificacoes",
    };
  }
}

/**
 * Marca uma notificacao do usuario autenticado como lida.
 */
export async function markAsRead(id: string): Promise<ActionResult<null>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Nao autenticado" };

    await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { isRead: true },
    });

    return { success: true, data: null };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Erro ao marcar notificacao",
    };
  }
}

/**
 * Marca todas as notificacoes do usuario autenticado como lidas.
 */
export async function markAllAsRead(): Promise<ActionResult<null>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Nao autenticado" };

    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });

    return { success: true, data: null };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Erro ao marcar notificacoes",
    };
  }
}

/**
 * Retorna a contagem de notificacoes nao lidas do usuario autenticado.
 */
export async function getUnreadCount(): Promise<ActionResult<number>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Nao autenticado" };

    const count = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    return { success: true, data: count };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Erro ao contar notificacoes",
    };
  }
}
