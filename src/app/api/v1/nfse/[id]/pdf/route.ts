import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/api/auth";
import { apiError, withErrorHandler } from "@/lib/api/response";
import { generateDanfsePdf } from "@/lib/nfse/pdf-generator";

export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: unknown
) => {
  await requireApiKey(request);
  const { id } = await (context as { params: Promise<{ id: string }> }).params;

  const n = await prisma.nfse.findUnique({
    where: { id },
    include: {
      clienteMei: true,
    },
  });

  if (!n) return apiError("NOT_FOUND", "NFS-e nao encontrada", 404);

  const pdf = generateDanfsePdf({
    numero: n.numero,
    serie: n.serie,
    chaveAcesso: n.chaveAcesso,
    dataEmissao: n.dataEmissao.toLocaleDateString("pt-BR"),
    prestadorCnpj: n.clienteMei.cnpj,
    prestadorNome: n.clienteMei.razaoSocial,
    prestadorEndereco: `${n.clienteMei.logradouro}, ${n.clienteMei.numero} - ${n.clienteMei.bairro}, ${n.clienteMei.uf}`,
    tomadorDocumento: n.tomadorDocumento,
    tomadorNome: n.tomadorNome,
    tomadorEmail: n.tomadorEmail,
    codigoServico: n.codigoServico,
    descricaoServico: n.descricaoServico,
    valorServico: Number(n.valorServico),
    aliquotaIss: Number(n.aliquotaIss),
    valorIss: Number(n.valorIss),
  });

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="nfse-${n.serie}-${n.numero}.pdf"`,
    },
  });
});
