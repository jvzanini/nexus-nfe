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

import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";

import { prisma } from "../lib/prisma";
import { checkCertificateExpiration } from "../lib/certificates/check-expiration";
import { handleEmitNfse } from "./handlers/emit-nfse";
import { handleReconcileNfse } from "./handlers/reconcile-nfse";

type NfeJobData = {
  nfseId: string;
  clienteMeiId: string;
};

type OutboxJobData = {
  eventId: string;
};

type CronJobData = {
  task: "check-cert-expiration" | "reconcile-nfse";
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
    console.log(`[NFE] processing job ${job.id} nfseId=${job.data.nfseId}`);
    return handleEmitNfse(job);
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
// Worker: Cron (tarefas recorrentes)
// ------------------------------------------------------------

const cronQueue = new Queue<CronJobData>("cron", { connection });

const cronWorker = new Worker<CronJobData>(
  "cron",
  async (job: Job<CronJobData>) => {
    switch (job.data.task) {
      case "check-cert-expiration": {
        const result = await checkCertificateExpiration();
        console.log(
          `[cron] cert-expiration checked=${result.totalChecked} expired=${result.expired} expiring=${result.expiringSoon} notifs=${result.notificationsCreated}`
        );
        return result;
      }
      case "reconcile-nfse": {
        const result = await handleReconcileNfse();
        console.log(
          `[cron] reconcile checked=${result.checked} recovered=${result.recovered} failed=${result.failed}`
        );
        return result;
      }
      default:
        console.warn(`[cron] unknown task: ${JSON.stringify(job.data)}`);
        return { ok: false };
    }
  },
  { connection, concurrency: 1 }
);

cronWorker.on("failed", (job, err) => {
  console.error(`[cron] job ${job?.id} failed:`, err.message);
});

// Agenda verificação diária de certificados às 08:00 (horário do servidor).
// upsertJobScheduler é idempotente — seguro rodar a cada boot do worker.
async function setupSchedulers() {
  try {
    await cronQueue.upsertJobScheduler(
      "cert-expiration-daily",
      { pattern: "0 8 * * *" },
      {
        name: "check-cert-expiration",
        data: { task: "check-cert-expiration" },
        opts: { removeOnComplete: 10, removeOnFail: 10 },
      }
    );
    console.log("[cron] scheduled: cert-expiration-daily @ 08:00");
    await cronQueue.upsertJobScheduler(
      "reconcile-nfse-5min",
      { pattern: "*/5 * * * *" }, // a cada 5 minutos
      {
        name: "reconcile-nfse",
        data: { task: "reconcile-nfse" },
        opts: { removeOnComplete: 10, removeOnFail: 10 },
      }
    );
    console.log("[cron] scheduled: reconcile-nfse-5min @ every 5 min");
  } catch (err) {
    console.error("[cron] failed to setup schedulers", err);
  }
}

void setupSchedulers();

// ------------------------------------------------------------
// Graceful shutdown
// ------------------------------------------------------------

async function shutdown(signal: string) {
  console.log(`[worker] received ${signal}, shutting down...`);
  try {
    await Promise.all([
      nfeWorker.close(),
      outboxWorker.close(),
      cronWorker.close(),
    ]);
    await cronQueue.close();
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

console.log("Worker started (nfe + outbox + cron)");
