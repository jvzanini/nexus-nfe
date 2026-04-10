import { prisma } from "@/lib/prisma";
import { outboxQueue } from "@/lib/queue";

const STALE_THRESHOLD_MS = 60_000;
const MAX_BATCH = 100;

/**
 * Fallback: varre eventos `pending` com mais de 1 minuto e reenfileira.
 * Ideal rodar como cron (ex: cada 2 minutos).
 */
export async function dispatchPendingOutboxEvents(): Promise<{
  requeued: number;
}> {
  const threshold = new Date(Date.now() - STALE_THRESHOLD_MS);

  const pending = await prisma.outboxEvent.findMany({
    where: {
      status: "pending",
      createdAt: { lt: threshold },
    },
    orderBy: { createdAt: "asc" },
    take: MAX_BATCH,
  });

  let requeued = 0;
  for (const ev of pending) {
    try {
      await outboxQueue.add(
        "publish",
        { eventId: ev.id },
        { jobId: `${ev.id}-retry-${Date.now()}` }
      );
      requeued++;
    } catch (err) {
      console.error(
        "[outbox-dispatcher] failed to requeue event",
        ev.id,
        err
      );
    }
  }

  if (requeued > 0) {
    console.log(`[outbox-dispatcher] requeued ${requeued} stale event(s)`);
  }

  return { requeued };
}
