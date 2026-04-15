// src/worker/handlers/emit-nfse.ts
import type { Job } from "bullmq";
import { PrismaClient } from "../../generated/prisma/client";
import { decrypt } from "../../lib/encryption";
import { parsePfx } from "../../lib/nfse/pfx-loader";
import { prepareSubmission } from "../../lib/nfse/prepare-submission";
import { SefinClient } from "../../lib/nfse/sefin-client";
import type { Dps } from "../../lib/nfse/types";
import { sendNotificationEmail } from "../../lib/notifications-email";

async function enqueueWebhookEvent(
  event: "nfse.autorizada" | "nfse.rejeitada" | "nfse.cancelada",
  nfse: {
    id: string;
    clienteMeiId: string;
    serie: string;
    numero: string;
    status: string;
    chaveAcesso: string | null;
    numeroNfse: string | null;
    valorServico: { toString(): string };
    tomadorNome: string;
    tomadorDocumento: string;
  }
) {
  try {
    await prisma.outboxEvent.create({
      data: {
        aggregateId: nfse.id,
        eventType: event,
        payload: {
          event,
          nfseId: nfse.id,
          clienteMeiId: nfse.clienteMeiId,
          status: nfse.status,
          chaveAcesso: nfse.chaveAcesso,
          numeroNfse: nfse.numeroNfse,
          serie: nfse.serie,
          numero: nfse.numero,
          valorServico: nfse.valorServico.toString(),
          tomadorNome: nfse.tomadorNome,
          tomadorDocumento: nfse.tomadorDocumento,
          occurredAt: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    console.error(`[emit-nfse] enqueueWebhookEvent ${event} failed`, err);
  }
}

const prisma = new PrismaClient();

export interface EmitNfseJobData {
  nfseId: string;
  clienteMeiId: string;
}

export async function handleEmitNfse(job: Job<EmitNfseJobData>): Promise<{ ok: boolean; chaveAcesso?: string }> {
  const { nfseId, clienteMeiId } = job.data;

  const nfse = await prisma.nfse.findUnique({
    where: { id: nfseId },
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
  });

  if (!nfse) throw new Error(`NFS-e ${nfseId} não encontrada`);
  if (nfse.status !== "pendente") {
    console.log(`[emit-nfse] NFS-e ${nfseId} status=${nfse.status}, ignorando`);
    return { ok: false };
  }

  const cert = nfse.clienteMei.certificados[0];
  if (!cert) throw new Error(`Cliente ${clienteMeiId} sem certificado válido`);

  await prisma.nfse.update({
    where: { id: nfseId },
    data: { status: "processando" },
  });

  try {
    const pfxBase64 = decrypt(cert.pfxEncrypted);
    const pfxPassword = decrypt(cert.senhaEncrypted);
    const pfxBuffer = Buffer.from(pfxBase64, "base64");

    const cliente = nfse.clienteMei;
    const dps: Dps = {
      versao: "1.00",
      infDps: {
        id: nfse.idDps,
        tipoAmbiente: nfse.ambiente === "producao" ? 1 : 2,
        dataHoraEmissao: new Date(),
        versaoAplicativo: "NexusNFE-1.0.0",
        serie: nfse.serie,
        numero: nfse.numero,
        dataCompetencia: nfse.dataCompetencia,
        tipoEmitente: 1,
        codigoLocalEmissao: cliente.municipioIbge,
        prestador: {
          tipoDocumento: "cnpj",
          documento: cliente.cnpj,
          nome: cliente.razaoSocial,
          endereco: {
            tipo: "nacional",
            cep: cliente.cep,
            logradouro: cliente.logradouro,
            numero: cliente.numero,
            complemento: cliente.complemento ?? undefined,
            bairro: cliente.bairro,
            municipioIbge: cliente.municipioIbge,
          },
          regimeTributario: {
            opcaoSimplesNacional: 2,
            regimeEspecialTributacao: 0,
          },
        },
        tomador: {
          tipoDocumento: nfse.tomadorTipo as "cpf" | "cnpj",
          documento: nfse.tomadorDocumento,
          nome: nfse.tomadorNome,
          email: nfse.tomadorEmail ?? undefined,
          endereco: nfse.tomadorEndereco
            ? ({ tipo: "nacional", ...(nfse.tomadorEndereco as Record<string, string>) } as any)
            : undefined,
        },
        servico: {
          localPrestacao: { municipioIbge: nfse.localPrestacaoIbge },
          codigoServico: {
            codigoTributacaoNacional: nfse.codigoServico,
            codigoNbs: nfse.codigoNbs ?? undefined,
            descricao: nfse.descricaoServico,
          },
        },
        valores: {
          valorServico: Number(nfse.valorServico),
          aliquotaIss: Number(nfse.aliquotaIss),
          tributacaoIssqn: 1,
        },
      },
    };

    const submission = prepareSubmission(dps, pfxBuffer, pfxPassword);

    const certInfo = parsePfx(pfxBuffer, pfxPassword);
    const sefin = new SefinClient({
      ambiente: nfse.ambiente === "producao" ? "producao" : "homologacao",
      privateKeyPem: certInfo.privateKeyPem,
      certPem: certInfo.certPem,
    });

    const result = await sefin.submitNfse(submission.dpsXmlGZipB64);

    if (result.success) {
      const updated = await prisma.nfse.update({
        where: { id: nfseId },
        data: {
          status: "autorizada",
          chaveAcesso: result.chaveAcesso,
          numeroNfse: result.numeroNfse,
          dataAutorizacao: result.dataAutorizacao ? new Date(result.dataAutorizacao) : new Date(),
          xmlAssinado: submission.xmlAssinado,
          xmlAutorizado: result.xmlAutorizado ?? null,
          codigoResposta: "200",
          mensagemResposta: "Autorizada",
        },
      });
      await enqueueWebhookEvent("nfse.autorizada", {
        id: updated.id,
        clienteMeiId: updated.clienteMeiId,
        serie: updated.serie,
        numero: updated.numero,
        status: updated.status,
        chaveAcesso: updated.chaveAcesso,
        numeroNfse: updated.numeroNfse,
        valorServico: updated.valorServico,
        tomadorNome: updated.tomadorNome,
        tomadorDocumento: updated.tomadorDocumento,
      });
      return { ok: true, chaveAcesso: result.chaveAcesso };
    } else {
      await prisma.nfse.update({
        where: { id: nfseId },
        data: {
          status: "rejeitada",
          codigoResposta: result.codigo,
          mensagemResposta: result.mensagem,
          tentativas: { increment: 1 },
          ultimoErro: result.mensagem,
        },
      });
      await notifyNfseIssue(nfse, "rejeitada", result.mensagem ?? "Rejeitada sem mensagem");
      await enqueueWebhookEvent("nfse.rejeitada", {
        id: nfse.id,
        clienteMeiId: nfse.clienteMeiId,
        serie: nfse.serie,
        numero: nfse.numero,
        status: "rejeitada",
        chaveAcesso: null,
        numeroNfse: null,
        valorServico: nfse.valorServico,
        tomadorNome: nfse.tomadorNome,
        tomadorDocumento: nfse.tomadorDocumento,
      });
      return { ok: false };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await prisma.nfse.update({
      where: { id: nfseId },
      data: {
        status: "erro",
        tentativas: { increment: 1 },
        ultimoErro: msg,
      },
    });
    await notifyNfseIssue(nfse, "erro", msg);
    throw error;
  }
}

async function notifyNfseIssue(
  nfse: { id: string; serie: string; numero: string; tomadorNome: string; createdById: string },
  kind: "rejeitada" | "erro",
  mensagem: string
) {
  try {
    const title =
      kind === "rejeitada"
        ? `NFS-e ${nfse.serie}-${nfse.numero} rejeitada`
        : `NFS-e ${nfse.serie}-${nfse.numero} com erro de processamento`;
    const message = `Tomador ${nfse.tomadorNome}. Motivo: ${mensagem}`;
    const link = `/nfse/${nfse.id}`;

    const emailResult = await sendNotificationEmail({
      userId: nfse.createdById,
      type: "error",
      title,
      message,
      link,
    });

    await prisma.notification.create({
      data: {
        userId: nfse.createdById,
        type: "error",
        title,
        message,
        link,
        channelsSent: { inApp: true, email: emailResult.sent },
      },
    });
  } catch (err) {
    console.error(`[emit-nfse] notifyNfseIssue falhou`, err);
  }
}
