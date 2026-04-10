import { prisma } from "@/lib/prisma";
import { outboxQueue } from "@/lib/queue";

export interface PublishEventInput {
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Cria um OutboxEvent com status `pending` e enfileira um job para publica-lo.
 * Aceita uma transacao opcional para ser chamado dentro de `prisma.$transaction`.
 */
export async function publishEvent(
  input: PublishEventInput,
  tx?: PrismaTx
): Promise<{ eventId: string }> {
  const client = tx ?? prisma;

  const event = await client.outboxEvent.create({
    data: {
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      payload: input.payload as object,
      status: "pending",
    },
  });

  // Enfileira apos persistir. Se a transacao for revertida depois,
  // o dispatcher de fallback ignorara (o evento nao existira).
  try {
    await outboxQueue.add(
      "publish",
      { eventId: event.id },
      { jobId: event.id }
    );
  } catch (err) {
    console.error("[outbox] failed to enqueue publish job", err);
  }

  return { eventId: event.id };
}
