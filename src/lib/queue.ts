import { Queue } from "bullmq";

import { redis } from "@/lib/redis";

export type NfeJobData = {
  clienteMeiId: string;
  tipo: string;
  payload: unknown;
};

export type OutboxJobData = {
  eventId: string;
};

/**
 * Fila principal de processamento de NFes (stub ate Fase 2).
 */
export const nfeQueue = new Queue<NfeJobData>("nfe", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2_000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 24 * 3600 },
  },
});

/**
 * Fila responsavel por publicar eventos do outbox pattern.
 */
export const outboxQueue = new Queue<OutboxJobData>("outbox", {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 1_000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 7 * 24 * 3600 },
  },
});
