/**
 * Worker BullMQ — Nexus NFE
 *
 * Entry point empacotado via esbuild separadamente do Next.
 * Por isso NAO usa imports com alias `@/` — apenas paths relativos.
 *
 * Roda dois workers:
 *  - "nfe"    : processamento de NFes (stub, sera expandido na Fase 2)
 *  - "outbox" : publica eventos do outbox pattern
 */

import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";

import { prisma } from "../lib/prisma";

type NfeJobData = {
  clienteMeiId: string;
  tipo: string;
  payload: unknown;
};

type OutboxJobData = {
  eventId: string;
};

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  console.error("[worker] REDIS_URL nao definido no ambiente");
  process.exit(1);
}

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

// ------------------------------------------------------------
// Worker: NFE (stub)
// ------------------------------------------------------------

const nfeWorker = new Worker<NfeJobData>(
  "nfe",
  async (job: Job<NfeJobData>) => {
    console.log(
      `[NFE] processing job ${job.id} cliente=${job.data.clienteMeiId} tipo=${job.data.tipo}`
    );
    // Fase 2: integrar emissao NFe aqui.
    return { ok: true };
  },
  { connection, concurrency: 5 }
);

nfeWorker.on("failed", (job, err) => {
  console.error(`[NFE] job ${job?.id} failed:`, err.message);
});

// ------------------------------------------------------------
// Worker: Outbox
// ------------------------------------------------------------

const outboxWorker = new Worker<OutboxJobData>(
  "outbox",
  async (job: Job<OutboxJobData>) => {
    const { eventId } = job.data;

    const event = await prisma.outboxEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      console.warn(`[outbox] event ${eventId} not found, skipping`);
      return { ok: false, reason: "not_found" };
    }

    if (event.status === "published") {
      return { ok: true, alreadyPublished: true };
    }

    // Reivindica o evento marcando-o como publishing.
    try {
      await prisma.outboxEvent.update({
        where: { id: eventId },
        data: {
          status: "publishing",
          attempts: { increment: 1 },
        },
      });
    } catch (err) {
      console.error(`[outbox] failed to claim event ${eventId}`, err);
      throw err;
    }

    try {
      // Fase 2: publicar no destino real (webhook, broker, etc).
      console.log(
        `[outbox] publishing event ${eventId} type=${event.eventType} aggregate=${event.aggregateId}`
      );

      await prisma.outboxEvent.update({
        where: { id: eventId },
        data: {
          status: "published",
          publishedAt: new Date(),
          lastError: null,
        },
      });

      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.outboxEvent.update({
        where: { id: eventId },
        data: {
          status: "failed",
          lastError: message,
        },
      });
      throw err;
    }
  },
  { connection, concurrency: 10 }
);

outboxWorker.on("failed", (job, err) => {
  console.error(`[outbox] job ${job?.id} failed:`, err.message);
});

// ------------------------------------------------------------
// Graceful shutdown
// ------------------------------------------------------------

async function shutdown(signal: string) {
  console.log(`[worker] received ${signal}, shutting down...`);
  try {
    await Promise.all([nfeWorker.close(), outboxWorker.close()]);
    await connection.quit();
    await prisma.$disconnect();
  } catch (err) {
    console.error("[worker] error during shutdown", err);
  } finally {
    process.exit(0);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

console.log("Worker started (nfe + outbox)");
