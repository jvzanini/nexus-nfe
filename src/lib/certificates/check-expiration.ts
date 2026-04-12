// Checagem diária de expiração de certificados digitais.
//
// IMPORTANTE: este módulo é importado pelo worker BullMQ (empacotado
// via esbuild separadamente do Next). Usar apenas imports relativos —
// NÃO usar alias `@/`.

import { prisma } from "../prisma";

export interface ExpirationCheckResult {
  totalChecked: number;
  expired: number;
  expiringSoon: number;
  notificationsCreated: number;
}

export interface ExpirationCheckOptions {
  /** Dias de antecedência pra avisar que vai expirar (default 30) */
  warningDays?: number;
  /** Data de referência pra testes (default now) */
  now?: Date;
}

/**
 * Varre certificados não-revogados e:
 *  - Marca como revogado todo cert já expirado
 *  - Cria notificação in-app pra `createdById` do cliente quando o cert
 *    expira em até `warningDays` dias (sem duplicar se já alertou)
 *  - Cria notificação "expirado" quando o cert acabou de virar a data
 *
 * Idempotente: pode rodar N vezes por dia sem duplicar notificações (o
 * dedup é feito pelo `FaturamentoAnual.alertaEnviado`? Não — aqui não
 * temos flag nativa, então usamos `channelsSent.certId` como marcador).
 *
 * Simpler approach: criamos notificação nova a cada dia em que o cert
 * entra na janela, mas só se ainda não houver notificação do mesmo tipo
 * pro mesmo recurso nas últimas 24h.
 */
export async function checkCertificateExpiration(
  options: ExpirationCheckOptions = {}
): Promise<ExpirationCheckResult> {
  const warningDays = options.warningDays ?? 30;
  const now = options.now ?? new Date();
  const warningThreshold = new Date(
    now.getTime() + warningDays * 24 * 60 * 60 * 1000
  );

  const activos = await prisma.certificadoDigital.findMany({
    where: {
      revoked: false,
      notAfter: { lte: warningThreshold },
    },
    include: {
      clienteMei: {
        select: { razaoSocial: true, createdById: true },
      },
    },
  });

  let expired = 0;
  let expiringSoon = 0;
  let notificationsCreated = 0;

  for (const cert of activos) {
    const isExpired = cert.notAfter <= now;
    const diasRestantes = Math.floor(
      (cert.notAfter.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (isExpired) {
      expired++;

      // Marca como revogado — não serve mais pra assinar
      await prisma.certificadoDigital.update({
        where: { id: cert.id },
        data: { revoked: true },
      });
    } else {
      expiringSoon++;
    }

    const recipientId = cert.clienteMei.createdById;
    if (!recipientId) continue;

    // Dedup: já existe notificação desse tipo pro mesmo cert nas últimas 24h?
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const existing = await prisma.notification.findFirst({
      where: {
        userId: recipientId,
        link: `/clientes/${cert.clienteMeiId}`,
        createdAt: { gte: since },
        title: isExpired
          ? "Certificado digital expirado"
          : "Certificado digital expirando",
      },
      select: { id: true },
    });

    if (existing) continue;

    await prisma.notification.create({
      data: {
        userId: recipientId,
        type: isExpired ? "error" : "warning",
        title: isExpired
          ? "Certificado digital expirado"
          : "Certificado digital expirando",
        message: isExpired
          ? `O certificado de ${cert.clienteMei.razaoSocial} expirou e foi revogado automaticamente. Faça upload de um novo certificado pra continuar emitindo notas.`
          : `O certificado de ${cert.clienteMei.razaoSocial} expira em ${diasRestantes} dia(s). Providencie a renovação.`,
        link: `/clientes/${cert.clienteMeiId}`,
        channelsSent: { inApp: true },
      },
    });
    notificationsCreated++;
  }

  return {
    totalChecked: activos.length,
    expired,
    expiringSoon,
    notificationsCreated,
  };
}
