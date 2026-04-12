// src/worker/handlers/emit-nfse.ts
import type { Job } from "bullmq";
import { PrismaClient } from "../../generated/prisma/client";
import { decrypt } from "../../lib/encryption";
import { parsePfx } from "../../lib/nfse/pfx-loader";
import { prepareSubmission } from "../../lib/nfse/prepare-submission";
import { SefinClient } from "../../lib/nfse/sefin-client";
import type { Dps } from "../../lib/nfse/types";

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
            ? { tipo: "nacional" as const, ...(nfse.tomadorEndereco as Record<string, string>) }
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
      await prisma.nfse.update({
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
    throw error;
  }
}
