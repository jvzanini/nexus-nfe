import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/api/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api/response";

/**
 * GET /api/v1/empresas/{id}/certificado — Status do certificado digital (sem dados sensíveis)
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  await requireApiKey(request);
  const { id } = await params;

  const empresa = await prisma.clienteMei.findUnique({ where: { id }, select: { id: true } });
  if (!empresa) return apiError("NOT_FOUND", "Empresa não encontrada", 404);

  const cert = await prisma.certificadoDigital.findFirst({
    where: { clienteMeiId: id, revoked: false },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, commonName: true, thumbprint: true,
      notBefore: true, notAfter: true, nomeArquivo: true,
      createdAt: true,
    },
  });

  if (!cert) {
    return apiSuccess({ hasCertificado: false, certificado: null });
  }

  const now = new Date();
  return apiSuccess({
    hasCertificado: true,
    certificado: {
      id: cert.id,
      commonName: cert.commonName,
      thumbprint: cert.thumbprint,
      nomeArquivo: cert.nomeArquivo,
      notBefore: cert.notBefore,
      notAfter: cert.notAfter,
      valido: cert.notAfter > now,
      diasRestantes: Math.ceil((cert.notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      createdAt: cert.createdAt,
    },
  });
});
