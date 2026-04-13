import { Queue } from "bullmq";

import { redis } from "@/lib/redis";

export type NfeJobData = {
  nfseId: string;
  clienteMeiId: string;
};

export type OutboxJobData = {
  eventId: string;
};

const defaultJobOptions = {
  nfe: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2_000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 24 * 3600 },
  },
  outbox: {
    attempts: 5,
    backoff: { type: "exponential", delay: 1_000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 7 * 24 * 3600 },
  },
};

// Lazy singletons para evitar conexão Redis no import
let _nfeQueue: Queue<NfeJobData> | null = null;
let _outboxQueue: Queue<OutboxJobData> | null = null;

/**
 * Fila principal de processamento de NFes (stub ate Fase 2).
 */
export function getNfeQueue(): Queue<NfeJobData> {
  if (!_nfeQueue) {
    _nfeQueue = new Queue<NfeJobData>("nfe", {
      connection: redis,
      defaultJobOptions: defaultJobOptions.nfe,
    });
  }
  return _nfeQueue;
}

/**
 * Fila responsavel por publicar eventos do outbox pattern.
 */
export function getOutboxQueue(): Queue<OutboxJobData> {
  if (!_outboxQueue) {
    _outboxQueue = new Queue<OutboxJobData>("outbox", {
      connection: redis,
      defaultJobOptions: defaultJobOptions.outbox,
    });
  }
  return _outboxQueue;
}

// Proxies para compatibilidade retroativa com código que usa nfeQueue/outboxQueue diretamente
export const nfeQueue = new Proxy({} as Queue<NfeJobData>, {
  get(_target, prop) {
    return (getNfeQueue() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const outboxQueue = new Proxy({} as Queue<OutboxJobData>, {
  get(_target, prop) {
    return (getOutboxQueue() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
