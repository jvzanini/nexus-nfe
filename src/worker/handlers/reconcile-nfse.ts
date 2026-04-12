// src/worker/handlers/reconcile-nfse.ts
import { PrismaClient } from "../../generated/prisma/client";
import { decrypt } from "../../lib/encryption";
import { parsePfx } from "../../lib/nfse/pfx-loader";
import { SefinClient } from "../../lib/nfse/sefin-client";

const prisma = new PrismaClient();

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutos

export async function handleReconcileNfse(): Promise<{
  checked: number;
  recovered: number;
  failed: number;
}> {
  const threshold = new Date(Date.now() - STALE_THRESHOLD_MS);

  // Busca NFS-e em "processando" há mais de 5 minutos
  const staleNfses = await prisma.nfse.findMany({
    where: {
      status: "processando",
      updatedAt: { lt: threshold },
    },
    include: {
      clienteMei: {
        include: {
          certificados: {
            where: { revoked: false },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
    take: 20, // Processa no máximo 20 por vez
  });

  let recovered = 0;
  let failed = 0;

  for (const nfse of staleNfses) {
    const cert = nfse.clienteMei.certificados[0];
    if (!cert) {
      console.warn(`[reconcile] NFS-e ${nfse.id}: cliente sem certificado, marcando como erro`);
      await prisma.nfse.update({
        where: { id: nfse.id },
        data: { status: "erro", ultimoErro: "Certificado não disponível para reconciliação" },
      });
      failed++;
      continue;
    }

    try {
      const pfxBase64 = decrypt(cert.pfxEncrypted);
      const pfxPassword = decrypt(cert.senhaEncrypted);
      const pfxBuffer = Buffer.from(pfxBase64, "base64");
      const certInfo = parsePfx(pfxBuffer, pfxPassword);

      const sefin = new SefinClient({
        ambiente: nfse.ambiente === "producao" ? "producao" : "homologacao",
        privateKeyPem: certInfo.privateKeyPem,
        certPem: certInfo.certPem,
      });

      // HEAD /dps/{id} — verifica se o DPS foi processado
      const processed = await sefin.headDps(nfse.idDps);

      if (processed) {
        // DPS foi processado — tenta recuperar os dados via GET /dps/{id}
        // Por enquanto, marca como autorizada (sem chave de acesso, pois HEAD não retorna)
        // Na Fase completa, faria GET /dps/{id} pra obter a chave e depois GET /nfse/{chave}
        console.log(`[reconcile] NFS-e ${nfse.id}: DPS processado, marcando como autorizada`);
        await prisma.nfse.update({
          where: { id: nfse.id },
          data: {
            status: "autorizada",
            mensagemResposta: "Recuperada via reconciliação",
          },
        });
        recovered++;
      } else {
        // DPS não foi processado — pode ter falhado. Re-enfileirar ou marcar como erro
        console.log(`[reconcile] NFS-e ${nfse.id}: DPS não processado, marcando como erro`);
        await prisma.nfse.update({
          where: { id: nfse.id },
          data: {
            status: "erro",
            ultimoErro: "DPS não encontrado no SEFIN após timeout de processamento",
          },
        });
        failed++;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[reconcile] NFS-e ${nfse.id}: erro na reconciliação:`, msg);
      await prisma.nfse.update({
        where: { id: nfse.id },
        data: {
          status: "erro",
          ultimoErro: `Erro na reconciliação: ${msg}`,
        },
      });
      failed++;
    }
  }

  return { checked: staleNfses.length, recovered, failed };
}
