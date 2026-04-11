import { describe, it, expect } from "vitest";
import * as forge from "node-forge";
import { parsePfx, certPemToBase64 } from "../pfx-loader";

/**
 * Gera um .pfx self-signed pra testes. Não é um cert ICP-Brasil real,
 * mas serve pra exercitar o parser, a assinatura XMLDSIG e o pack/unpack.
 */
function generateTestPfx(
  password: string,
  commonName = "TESTE MEI LTDA:12345678000190"
): Buffer {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 1);

  const attrs = [
    { name: "commonName", value: commonName },
    { name: "countryName", value: "BR" },
    { name: "organizationName", value: "ICP-Brasil" },
    { name: "organizationalUnitName", value: "Autoridade Certificadora Teste" },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, {
    algorithm: "3des",
  });
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  return Buffer.from(p12Der, "binary");
}

describe("parsePfx", () => {
  it("extrai chave privada e certificado de um .pfx válido", () => {
    const pfxBuffer = generateTestPfx("senha123");
    const info = parsePfx(pfxBuffer, "senha123");

    expect(info.commonName).toContain("TESTE MEI LTDA");
    expect(info.cnpjCpf).toBe("12345678000190");
    expect(info.notAfter).toBeInstanceOf(Date);
    expect(info.notAfter.getTime()).toBeGreaterThan(Date.now());
    expect(info.privateKeyPem).toContain("BEGIN");
    expect(info.certPem).toContain("BEGIN CERTIFICATE");
    expect(info.thumbprint).toMatch(/^[a-f0-9]{40}$/i);
  });

  it("extrai CPF quando o CN contém 11 dígitos", () => {
    const pfxBuffer = generateTestPfx(
      "senha123",
      "JOAO DA SILVA:12345678901"
    );
    const info = parsePfx(pfxBuffer, "senha123");
    expect(info.cnpjCpf).toBe("12345678901");
  });

  it("lança erro com senha incorreta", () => {
    const pfxBuffer = generateTestPfx("senha123");
    expect(() => parsePfx(pfxBuffer, "senha-errada")).toThrow(/senha/i);
  });

  it("lança erro com buffer inválido", () => {
    expect(() => parsePfx(Buffer.from("lixo aleatório"), "qualquer")).toThrow();
  });
});

describe("certPemToBase64", () => {
  it("remove headers BEGIN/END e quebras de linha", () => {
    const pfxBuffer = generateTestPfx("senha123");
    const info = parsePfx(pfxBuffer, "senha123");
    const base64 = certPemToBase64(info.certPem);
    expect(base64).not.toContain("BEGIN");
    expect(base64).not.toContain("END");
    expect(base64).not.toContain("\n");
    expect(base64).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});
