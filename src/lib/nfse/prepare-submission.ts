// Orquestrador: monta o XML do DPS, assina com o certificado do prestador,
// empacota em GZip+Base64 e retorna o payload pronto pra enviar ao endpoint
// POST /nfse do SEFIN Nacional.

import type { Dps } from "./types";
import { buildDpsXml } from "./xml-builder";
import { signDps } from "./xml-signer";
import { packDps } from "./pack";
import { parsePfx } from "./pfx-loader";

export interface PreparedSubmission {
  /** Identificador do DPS (45 chars). */
  idDps: string;
  /** XML assinado (pré-empacotamento). Útil pra audit log. */
  xmlAssinado: string;
  /** Payload pronto pro body JSON: { dpsXmlGZipB64: string } */
  dpsXmlGZipB64: string;
  /** SHA-1 do certificado usado (pra audit/log). */
  certThumbprint: string;
}

/**
 * Orquestra build → sign → pack.
 *
 * Valida também que o CNPJ/CPF do certificado bate com o do prestador.
 * Isso previne erros grotescos como enviar nota de um cliente com o cert
 * de outro — a Receita também valida isso no servidor.
 */
export function prepareSubmission(
  dps: Dps,
  pfxBuffer: Buffer,
  pfxPassword: string
): PreparedSubmission {
  const certInfo = parsePfx(pfxBuffer, pfxPassword);

  const docPrestador = dps.infDps.prestador.documento;
  if (certInfo.cnpjCpf && certInfo.cnpjCpf !== docPrestador) {
    throw new Error(
      `CNPJ/CPF do certificado (${certInfo.cnpjCpf}) não confere com o do prestador (${docPrestador})`
    );
  }

  if (certInfo.notAfter.getTime() < Date.now()) {
    throw new Error(
      `Certificado expirado em ${certInfo.notAfter.toISOString()}`
    );
  }

  const xml = buildDpsXml(dps);
  const xmlAssinado = signDps({
    xml,
    privateKeyPem: certInfo.privateKeyPem,
    certPem: certInfo.certPem,
  });
  const dpsXmlGZipB64 = packDps(xmlAssinado);

  return {
    idDps: dps.infDps.id,
    xmlAssinado,
    dpsXmlGZipB64,
    certThumbprint: certInfo.thumbprint,
  };
}
