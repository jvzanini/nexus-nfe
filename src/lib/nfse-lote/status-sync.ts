import type { PrismaClient } from "@/generated/prisma/client";

type StatusTerminal = "autorizado" | "rejeitado" | "erro" | "cancelado";
type AnyPrisma = PrismaClient | any;

const TERMINAL: readonly StatusTerminal[] = [
  "autorizado",
  "rejeitado",
  "erro",
  "cancelado",
];

function mapStatus(
  nfseStatus: string
): "processando" | "autorizado" | "rejeitado" | "erro" | null {
  switch (nfseStatus) {
    case "processando":
      return "processando";
    case "autorizada":
      return "autorizado";
    case "rejeitada":
      return "rejeitado";
    case "erro":
      return "erro";
    default:
      return null;
  }
}

/**
 * Atualiza o item do lote correspondente a uma NFS-e, espelhando o status.
 * Se todos os itens chegarem em estado terminal, marca o lote como concluído e
 * cria notificação in-app + registro de auditoria.
 */
export async function atualizarStatusItemLote(
  prisma: AnyPrisma,
  nfseId: string,
  nfseStatus: string,
  erroMensagem?: string | null
): Promise<void> {
  const mapped = mapStatus(nfseStatus);
  if (!mapped) return;

  const item = await prisma.nfseLoteItem.findUnique({
    where: { nfseId },
    select: { id: true, loteId: true, status: true },
  });
  if (!item) return;

  await prisma.nfseLoteItem.update({
    where: { id: item.id },
    data: {
      status: mapped,
      erro: mapped === "rejeitado" || mapped === "erro" ? erroMensagem ?? null : null,
    },
  });

  const contagem = await prisma.nfseLoteItem.groupBy({
    by: ["status"],
    where: { loteId: item.loteId },
    _count: { _all: true },
  });

  const totalPorStatus = new Map<string, number>();
  let total = 0;
  for (const row of contagem) {
    totalPorStatus.set(row.status, row._count._all);
    total += row._count._all;
  }

  const terminais = TERMINAL.reduce(
    (sum, s) => sum + (totalPorStatus.get(s) ?? 0),
    0
  );

  const lote = await prisma.nfseLote.findUnique({
    where: { id: item.loteId },
    select: { id: true, status: true, createdById: true, totalItens: true },
  });
  if (!lote) return;

  if (terminais >= total && lote.status !== "concluido") {
    await prisma.nfseLote.update({
      where: { id: lote.id },
      data: { status: "concluido", finalizadoEm: new Date() },
    });

    const autorizadas = totalPorStatus.get("autorizado") ?? 0;
    const rejeitadas =
      (totalPorStatus.get("rejeitado") ?? 0) +
      (totalPorStatus.get("erro") ?? 0);

    try {
      await prisma.notification.create({
        data: {
          userId: lote.createdById,
          type: rejeitadas > 0 ? "warning" : "success",
          title: `Lote concluído: ${autorizadas}/${lote.totalItens} autorizadas`,
          message:
            rejeitadas > 0
              ? `${rejeitadas} item(ns) com erro/rejeição. Reprocessar pelo detalhe.`
              : `Todas as NFS-e do lote foram autorizadas.`,
          link: `/nfse/lote/${lote.id}`,
          channelsSent: { inApp: true, email: false },
        },
      });
    } catch (err) {
      console.error("[nfse-lote.status-sync] notificação falhou", err);
    }

    try {
      await prisma.auditLog.create({
        data: {
          actorType: "system",
          actorLabel: "system",
          action: "lote.concluido",
          resourceType: "nfse_lote",
          resourceId: lote.id,
          details: {
            total: lote.totalItens,
            autorizadas,
            rejeitadas,
          } as object,
        },
      });
    } catch (err) {
      console.error("[nfse-lote.status-sync] audit falhou", err);
    }
  } else if (lote.status === "pendente" && mapped === "processando") {
    await prisma.nfseLote.update({
      where: { id: lote.id },
      data: { status: "processando" },
    });
  }
}
