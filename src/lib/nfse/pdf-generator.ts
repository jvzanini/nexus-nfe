import { jsPDF } from "jspdf";

export interface DanfseData {
  numero: string;
  serie: string;
  chaveAcesso: string | null;
  dataEmissao: string;
  prestadorCnpj: string;
  prestadorNome: string;
  prestadorEndereco: string;
  tomadorDocumento: string;
  tomadorNome: string;
  tomadorEmail: string | null;
  codigoServico: string;
  descricaoServico: string;
  valorServico: number;
  aliquotaIss: number;
  valorIss: number;
}

export function generateDanfsePdf(data: DanfseData): Buffer {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(
    "DOCUMENTO AUXILIAR DA NOTA FISCAL DE SERVICO ELETRONICA",
    105,
    15,
    { align: "center" }
  );
  doc.text("NFS-e", 105, 22, { align: "center" });

  // NEXUS NFE branding
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("NEXUS NFE", 10, 15);

  // Line
  doc.setLineWidth(0.5);
  doc.line(10, 26, 200, 26);

  // NFS-e info
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Numero: ${data.serie}-${data.numero}`, 10, 34);
  doc.text(`Data de Emissao: ${data.dataEmissao}`, 110, 34);
  if (data.chaveAcesso) {
    doc.setFontSize(7);
    doc.text(`Chave de Acesso: ${data.chaveAcesso}`, 10, 40);
  }

  // Prestador
  doc.setLineWidth(0.3);
  doc.line(10, 44, 200, 44);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("PRESTADOR DE SERVICOS", 10, 50);
  doc.setFont("helvetica", "normal");
  doc.text(`CNPJ: ${data.prestadorCnpj}`, 10, 56);
  doc.text(`Razao Social: ${data.prestadorNome}`, 10, 62);
  doc.text(`Endereco: ${data.prestadorEndereco}`, 10, 68);

  // Tomador
  doc.line(10, 72, 200, 72);
  doc.setFont("helvetica", "bold");
  doc.text("TOMADOR DE SERVICOS", 10, 78);
  doc.setFont("helvetica", "normal");
  doc.text(`CPF/CNPJ: ${data.tomadorDocumento}`, 10, 84);
  doc.text(`Nome: ${data.tomadorNome}`, 10, 90);
  if (data.tomadorEmail) doc.text(`E-mail: ${data.tomadorEmail}`, 10, 96);

  // Servico
  const y1 = data.tomadorEmail ? 100 : 94;
  doc.line(10, y1, 200, y1);
  doc.setFont("helvetica", "bold");
  doc.text("DISCRIMINACAO DO SERVICO", 10, y1 + 6);
  doc.setFont("helvetica", "normal");
  doc.text(`Codigo: ${data.codigoServico}`, 10, y1 + 12);

  // Wrap long description
  const splitDesc = doc.splitTextToSize(data.descricaoServico, 180);
  doc.text(splitDesc, 10, y1 + 18);

  // Valores
  const y2 = y1 + 18 + splitDesc.length * 5 + 4;
  doc.line(10, y2, 200, y2);
  doc.setFont("helvetica", "bold");
  doc.text("VALORES", 10, y2 + 6);
  doc.setFont("helvetica", "normal");

  const formatBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  doc.text(`Valor do Servico: ${formatBRL(data.valorServico)}`, 10, y2 + 12);
  doc.text(`Aliquota ISS: ${data.aliquotaIss}%`, 10, y2 + 18);
  doc.text(`Valor ISS: ${formatBRL(data.valorIss)}`, 110, y2 + 18);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Valor Liquido: ${formatBRL(data.valorServico - data.valorIss)}`,
    10,
    y2 + 26
  );

  // Footer
  doc.setLineWidth(0.5);
  doc.line(10, 280, 200, 280);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Emitido via Nexus NFE - nfe.nexusai360.com", 105, 286, {
    align: "center",
  });

  return Buffer.from(doc.output("arraybuffer"));
}
