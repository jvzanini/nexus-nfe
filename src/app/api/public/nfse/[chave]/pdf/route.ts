import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDanfsePdf } from "@/lib/nfse/pdf-generator";

/**
 * GET /api/public/nfse/{chave}/pdf — Download público do DANFS-e (PDF).
 * Sem autenticação — qualquer um com a chave pode baixar o PDF.
 * Apenas NFS-e autorizadas.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chave: string }> }
) {
  const { chave } = await params;
  const chaveLimpa = chave.replace(/\D/g, "");

  const nfse = await prisma.nfse.findFirst({
    where: { chaveAcesso: chaveLimpa, status: "autorizada" },
    include: { clienteMei: true },
  });

  if (!nfse) {
    return new Response("NFS-e não encontrada ou não autorizada", { status: 404 });
  }

  const pdf = generateDanfsePdf({
    numero: nfse.numero,
    serie: nfse.serie,
    chaveAcesso: nfse.chaveAcesso,
    dataEmissao: nfse.dataEmissao.toLocaleDateString("pt-BR"),
    prestadorCnpj: nfse.clienteMei.cnpj,
    prestadorNome: nfse.clienteMei.razaoSocial,
    prestadorEndereco: `${nfse.clienteMei.logradouro}, ${nfse.clienteMei.numero} - ${nfse.clienteMei.bairro}, ${nfse.clienteMei.uf}`,
    tomadorDocumento: nfse.tomadorDocumento,
    tomadorNome: nfse.tomadorNome,
    tomadorEmail: nfse.tomadorEmail,
    codigoServico: nfse.codigoServico,
    descricaoServico: nfse.descricaoServico,
    valorServico: Number(nfse.valorServico),
    aliquotaIss: Number(nfse.aliquotaIss),
    valorIss: Number(nfse.valorIss),
  });

  const uint8 = new Uint8Array(pdf);
  return new Response(uint8, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="nfse-${nfse.serie}-${nfse.numero}.pdf"`,
      "Cache-Control": "private, max-age=0, no-cache",
    },
  });
}
