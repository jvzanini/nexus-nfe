import { prisma } from "@/lib/prisma";

export type NotificationType = "error" | "warning" | "info";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
}

/**
 * Helper para criar notificacoes in-app (fire-and-forget-friendly).
 * `channelsSent` comeca com `{ inApp: true }`.
 */
export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      channelsSent: { inApp: true },
    },
  });
}
