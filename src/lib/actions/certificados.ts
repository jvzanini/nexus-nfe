"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/encryption";
import { parsePfx, type CertInfo } from "@/lib/nfse/pfx-loader";

export interface CertificadoListItem {
  id: string;
  nomeArquivo: string;
  commonName: string;
  thumbprint: string;
  notBefore: Date;
  notAfter: Date;
  revoked: boolean;
  createdAt: Date;
}

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface UploadCertificadoInput {
  clienteMeiId: string;
  nomeArquivo: string;
  /** Conteúdo do .pfx em base64 */
  pfxBase64: string;
  senha: string;
}

/**
 * Faz upload de um novo certificado digital pra um cliente MEI.
 * - Parseia o .pfx com a senha informada
 * - Valida que o CNPJ do certificado bate com o do cliente
 * - Valida que o certificado não está expirado
 * - Cifra PFX + senha via AES-256-GCM antes de persistir
 * - Revoga certificados anteriores do mesmo cliente
 */
export async function uploadCertificado(
  input: UploadCertificadoInput
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole("admin");

    if (!input.pfxBase64 || !input.senha) {
      return { success: false, error: "Arquivo e senha são obrigatórios" };
    }

    const cliente = await prisma.clienteMei.findUnique({
      where: { id: input.clienteMeiId },
      select: { id: true, cnpj: true, razaoSocial: true },
    });
    if (!cliente) {
      return { success: false, error: "Cliente não encontrado" };
    }

    let pfxBuffer: Buffer;
    try {
      pfxBuffer = Buffer.from(input.pfxBase64, "base64");
    } catch {
      return { success: false, error: "Arquivo .pfx inválido" };
    }

    if (pfxBuffer.length === 0) {
      return { success: false, error: "Arquivo .pfx vazio" };
    }

    let info: CertInfo;
    try {
      info = parsePfx(pfxBuffer, input.senha);
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Erro ao processar certificado";
      return { success: false, error: msg };
    }

    if (info.cnpjCpf && info.cnpjCpf !== cliente.cnpj) {
      return {
        success: false,
        error: `CNPJ do certificado (${info.cnpjCpf}) não confere com o do cliente (${cliente.cnpj})`,
      };
    }

    const now = new Date();
    if (info.notAfter <= now) {
      return {
        success: false,
        error: `Certificado expirado em ${info.notAfter.toLocaleDateString("pt-BR")}`,
      };
    }
    if (info.notBefore > now) {
      return {
        success: false,
        error: `Certificado ainda não é válido (início em ${info.notBefore.toLocaleDateString("pt-BR")})`,
      };
    }

    const pfxEncrypted = encrypt(pfxBuffer.toString("base64"));
    const senhaEncrypted = encrypt(input.senha);

    const created = await prisma.$transaction(async (tx) => {
      // Revoga certificados anteriores do mesmo cliente
      await tx.certificadoDigital.updateMany({
        where: { clienteMeiId: cliente.id, revoked: false },
        data: { revoked: true },
      });

      return tx.certificadoDigital.create({
        data: {
          clienteMeiId: cliente.id,
          nomeArquivo: input.nomeArquivo,
          pfxEncrypted,
          senhaEncrypted,
          commonName: info.commonName,
          thumbprint: info.thumbprint,
          notBefore: info.notBefore,
          notAfter: info.notAfter,
        },
        select: { id: true },
      });
    });

    revalidatePath("/clientes");
    revalidatePath(`/clientes/${cliente.id}`);
    return { success: true, data: { id: created.id } };
  } catch (error) {
    console.error("[certificados.uploadCertificado]", error);
    if (error instanceof Error && error.message.includes("ENCRYPTION_KEY")) {
      return {
        success: false,
        error: "Chave de criptografia não configurada no servidor",
      };
    }
    return { success: false, error: "Erro ao fazer upload do certificado" };
  }
}

/**
 * Lista todos os certificados de um cliente (incluindo revogados).
 */
export async function listCertificados(
  clienteMeiId: string
): Promise<ActionResult<CertificadoListItem[]>> {
  try {
    await requireRole("admin");

    const certs = await prisma.certificadoDigital.findMany({
      where: { clienteMeiId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nomeArquivo: true,
        commonName: true,
        thumbprint: true,
        notBefore: true,
        notAfter: true,
        revoked: true,
        createdAt: true,
      },
    });

    return { success: true, data: certs };
  } catch (error) {
    console.error("[certificados.listCertificados]", error);
    return { success: false, error: "Erro ao listar certificados" };
  }
}

/**
 * Revoga manualmente um certificado (sem fazer upload de outro).
 */
export async function revokeCertificado(
  id: string
): Promise<ActionResult> {
  try {
    await requireRole("admin");

    const cert = await prisma.certificadoDigital.findUnique({
      where: { id },
      select: { id: true, clienteMeiId: true, revoked: true },
    });
    if (!cert) return { success: false, error: "Certificado não encontrado" };
    if (cert.revoked) return { success: true };

    await prisma.certificadoDigital.update({
      where: { id },
      data: { revoked: true },
    });

    revalidatePath(`/clientes/${cert.clienteMeiId}`);
    return { success: true };
  } catch (error) {
    console.error("[certificados.revokeCertificado]", error);
    return { success: false, error: "Erro ao revogar certificado" };
  }
}

/**
 * **Uso interno do worker — NÃO expor em client components.**
 * Carrega o PFX ativo de um cliente e retorna decifrado, pronto pra
 * assinatura XMLDSIG / mTLS.
 */
export async function loadCertificadoForSigning(
  clienteMeiId: string
): Promise<
  ActionResult<{
    pfxBuffer: Buffer;
    senha: string;
    notAfter: Date;
    thumbprint: string;
  }>
> {
  try {
    // Sem requireRole — a action é chamada internamente pelo worker, que
    // não tem contexto de sessão. Proteger via convenção de import.
    const cert = await prisma.certificadoDigital.findFirst({
      where: { clienteMeiId, revoked: false },
      orderBy: { createdAt: "desc" },
      select: {
        pfxEncrypted: true,
        senhaEncrypted: true,
        notAfter: true,
        thumbprint: true,
      },
    });

    if (!cert) {
      return { success: false, error: "Nenhum certificado ativo pro cliente" };
    }

    const now = new Date();
    if (cert.notAfter <= now) {
      return { success: false, error: "Certificado ativo está expirado" };
    }

    const pfxBase64 = decrypt(cert.pfxEncrypted);
    const senha = decrypt(cert.senhaEncrypted);
    const pfxBuffer = Buffer.from(pfxBase64, "base64");

    return {
      success: true,
      data: {
        pfxBuffer,
        senha,
        notAfter: cert.notAfter,
        thumbprint: cert.thumbprint,
      },
    };
  } catch (error) {
    console.error("[certificados.loadCertificadoForSigning]", error);
    return { success: false, error: "Erro ao carregar certificado" };
  }
}
