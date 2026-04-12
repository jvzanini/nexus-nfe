import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/api/auth";
import { apiError, withErrorHandler } from "@/lib/api/response";

/**
 * GET /api/v1/nfse/{id}/xml — Retorna XML da NFS-e
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  await requireApiKey(request);
  const { id } = await params;

  const n = await prisma.nfse.findUnique({
    where: { id },
    select: { xmlAutorizado: true, xmlAssinado: true, serie: true, numero: true },
  });

  if (!n) return apiError("NOT_FOUND", "NFS-e não encontrada", 404);

  const xml = n.xmlAutorizado ?? n.xmlAssinado;
  if (!xml) return apiError("NO_XML", "XML não disponível", 404);

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="nfse-${n.serie}-${n.numero}.xml"`,
    },
  });
});
