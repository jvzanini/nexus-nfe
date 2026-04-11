// Parser de arquivo .pfx/.p12 (PKCS#12) usando node-forge.
// Extrai chave privada + certificado X.509 + metadata pra uso em XMLDSIG e mTLS.

import * as forge from "node-forge";
import crypto from "node:crypto";

export interface CertInfo {
  /** Common Name do certificado (formato ICP-Brasil típico: "NOME:CNPJ"). */
  commonName: string;
  /** CNPJ ou CPF extraído do CN, se aplicável. String vazia se não encontrar. */
  cnpjCpf: string;
  /** SHA-1 fingerprint em hex lowercase (40 chars). */
  thumbprint: string;
  notBefore: Date;
  notAfter: Date;
  /** Chave privada em formato PEM (BEGIN PRIVATE KEY / END PRIVATE KEY). */
  privateKeyPem: string;
  /** Certificado X.509 em formato PEM (BEGIN CERTIFICATE / END CERTIFICATE). */
  certPem: string;
}

/**
 * Parseia um buffer .pfx com senha e retorna chave + cert + metadata.
 * Lança Error com mensagem amigável em caso de senha incorreta ou arquivo inválido.
 */
export function parsePfx(pfxBuffer: Buffer, password: string): CertInfo {
  try {
    const p12Der = forge.util.createBuffer(pfxBuffer.toString("binary"));
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

    // Extrai bags
    const keyBags = p12.getBags({
      bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
    });
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });

    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
    const certBag = certBags[forge.pki.oids.certBag]?.[0];

    if (!keyBag?.key || !certBag?.cert) {
      throw new Error(
        "Certificado ou chave privada não encontrados no arquivo .pfx"
      );
    }

    const cert = certBag.cert;
    const privateKeyPem = forge.pki.privateKeyToPem(keyBag.key);
    const certPem = forge.pki.certificateToPem(cert);

    // Common Name
    const cnAttr = cert.subject.getField("CN");
    const commonName = typeof cnAttr?.value === "string" ? cnAttr.value : "";

    // Extrai CNPJ (14 dígitos) ou CPF (11 dígitos) do CN
    // ICP-Brasil usa "NOME:CNPJ" como padrão mais comum
    const docMatch = commonName.match(/(\d{14}|\d{11})/);
    const cnpjCpf = docMatch ? docMatch[1] : "";

    // Thumbprint (SHA-1 do DER binário)
    const derBytes = forge.asn1
      .toDer(forge.pki.certificateToAsn1(cert))
      .getBytes();
    const thumbprint = crypto
      .createHash("sha1")
      .update(Buffer.from(derBytes, "binary"))
      .digest("hex");

    return {
      commonName,
      cnpjCpf,
      thumbprint,
      notBefore: cert.validity.notBefore,
      notAfter: cert.validity.notAfter,
      privateKeyPem,
      certPem,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.toLowerCase().includes("password") ||
      msg.toLowerCase().includes("mac") ||
      msg.toLowerCase().includes("pkcs#12")
    ) {
      throw new Error("Senha do certificado incorreta ou arquivo .pfx inválido");
    }
    throw new Error(`Arquivo .pfx inválido: ${msg}`);
  }
}

/**
 * Retorna o certificado X.509 sem os cabeçalhos BEGIN/END e sem quebras de linha.
 * Usado pra embedar em XMLDSIG KeyInfo/X509Certificate.
 */
export function certPemToBase64(certPem: string): string {
  return certPem
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s+/g, "");
}
