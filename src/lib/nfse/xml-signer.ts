// Assinatura XMLDSIG do DPS conforme padrão W3C utilizado pela Receita.
//
// Requisitos extraídos do manual e da biblioteca Rainzart/nfse-nacional (PHP):
// - Canonicalização: http://www.w3.org/TR/2001/REC-xml-c14n-20010315
// - Transforms: enveloped-signature + c14n
// - Digest: http://www.w3.org/2001/04/xmlenc#sha256
// - Signature: http://www.w3.org/2001/04/xmldsig-more#rsa-sha256
// - Signatura deve referenciar o elemento <infDPS> pelo atributo Id
// - X509Certificate embedado no KeyInfo (sem headers BEGIN/END)

import { SignedXml } from "xml-crypto";
import { certPemToBase64 } from "./pfx-loader";

export interface SignDpsInput {
  /** XML do DPS sem assinatura, começando com a declaração XML. */
  xml: string;
  /** Chave privada em formato PEM (BEGIN PRIVATE KEY / END PRIVATE KEY). */
  privateKeyPem: string;
  /** Certificado X.509 em formato PEM. */
  certPem: string;
}

/**
 * Assina o DPS retornando o XML com o bloco <Signature> dentro do elemento raiz
 * <DPS>, após o elemento <infDPS>.
 */
export function signDps(input: SignDpsInput): string {
  const sig = new SignedXml({
    privateKey: input.privateKeyPem,
    publicCert: input.certPem,
    canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    signatureAlgorithm: "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
  });

  // Referencia o elemento infDPS via xpath namespace-agnostic (local-name).
  // A API gov.br/nfse assina o infDPS, não o root DPS.
  sig.addReference({
    xpath: "//*[local-name(.)='infDPS']",
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    ],
    digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256",
  });

  // Customiza o KeyInfo pra incluir o certificado X.509
  // xml-crypto aceita função que retorna uma string XML
  sig.getKeyInfoContent = () => {
    const base64Cert = certPemToBase64(input.certPem);
    return `<X509Data><X509Certificate>${base64Cert}</X509Certificate></X509Data>`;
  };

  // Computa a assinatura. A location aponta onde o bloco <Signature> vai ser
  // inserido no XML: depois do elemento infDPS, dentro do DPS (root).
  sig.computeSignature(input.xml, {
    location: {
      reference: "//*[local-name(.)='infDPS']",
      action: "after",
    },
  });

  return sig.getSignedXml();
}
