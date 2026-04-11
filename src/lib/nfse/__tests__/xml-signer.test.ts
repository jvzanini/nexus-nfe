import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import * as forge from "node-forge";
import { parsePfx } from "../pfx-loader";
import { signDps } from "../xml-signer";
import { buildDpsXml } from "../xml-builder";
import { buildIdDps } from "../dps-id";
import type { Dps } from "../types";

function generateTestPfx(
  password: string,
  commonName = "TESTE MEI LTDA:12345678000190",
  algorithm: "3des" | "aes256" = "3des"
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
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, {
    algorithm,
  });
  return Buffer.from(forge.asn1.toDer(p12Asn1).getBytes(), "binary");
}

function makeMinimalDps(): Dps {
  return {
    versao: "1.00",
    infDps: {
      id: buildIdDps({
        codigoLocalEmissao: "5300108",
        tipoInscricao: 1,
        inscricaoFederal: "12345678000190",
        serie: "1",
        numero: "1",
      }),
      tipoAmbiente: 2,
      dataHoraEmissao: new Date("2026-04-10T14:30:00Z"),
      versaoAplicativo: "NexusNFE-1.0.0",
      serie: "1",
      numero: "1",
      dataCompetencia: new Date("2026-04-10T12:00:00Z"),
      tipoEmitente: 1,
      codigoLocalEmissao: "5300108",
      prestador: {
        tipoDocumento: "cnpj",
        documento: "12345678000190",
        nome: "TESTE MEI LTDA",
        endereco: {
          tipo: "nacional",
          cep: "70000000",
          logradouro: "SQS 308 Bloco A",
          numero: "100",
          bairro: "Asa Sul",
          municipioIbge: "5300108",
        },
        regimeTributario: {
          opcaoSimplesNacional: 2,
          regimeEspecialTributacao: 0,
        },
      },
      tomador: {
        tipoDocumento: "cpf",
        documento: "12345678909",
        nome: "Joao da Silva",
      },
      servico: {
        localPrestacao: { municipioIbge: "5300108" },
        codigoServico: {
          codigoTributacaoNacional: "010101",
          descricao: "Consultoria em TI",
        },
      },
      valores: {
        valorServico: 1500.0,
        aliquotaIss: 2.0,
        tributacaoIssqn: 1,
      },
    },
  };
}

describe("signDps — estrutura da assinatura", () => {
  it("gera bloco Signature com SignedInfo, SignatureValue e KeyInfo", () => {
    const pfx = generateTestPfx("senha123");
    const cert = parsePfx(pfx, "senha123");
    const xml = buildDpsXml(makeMinimalDps());

    const signed = signDps({
      xml,
      privateKeyPem: cert.privateKeyPem,
      certPem: cert.certPem,
    });

    expect(signed).toContain("<Signature");
    expect(signed).toContain("<SignedInfo");
    expect(signed).toContain("<SignatureValue");
    expect(signed).toContain("<KeyInfo");
    expect(signed).toContain("<X509Certificate");
  });

  it("usa canonicalização c14n 2001", () => {
    const pfx = generateTestPfx("senha123");
    const cert = parsePfx(pfx, "senha123");
    const xml = buildDpsXml(makeMinimalDps());
    const signed = signDps({
      xml,
      privateKeyPem: cert.privateKeyPem,
      certPem: cert.certPem,
    });
    expect(signed).toContain(
      "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"
    );
  });

  it("usa RSA-SHA256 pra assinatura e SHA-256 pro digest", () => {
    const pfx = generateTestPfx("senha123");
    const cert = parsePfx(pfx, "senha123");
    const xml = buildDpsXml(makeMinimalDps());
    const signed = signDps({
      xml,
      privateKeyPem: cert.privateKeyPem,
      certPem: cert.certPem,
    });
    expect(signed).toContain(
      "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"
    );
    expect(signed).toContain("http://www.w3.org/2001/04/xmlenc#sha256");
  });

  it("referencia o elemento infDPS no Reference URI", () => {
    const pfx = generateTestPfx("senha123");
    const cert = parsePfx(pfx, "senha123");
    const xml = buildDpsXml(makeMinimalDps());
    const signed = signDps({
      xml,
      privateKeyPem: cert.privateKeyPem,
      certPem: cert.certPem,
    });
    // xml-crypto detecta Id automaticamente do elemento referenciado
    expect(signed).toMatch(/URI="#DPS\d{42}"/);
  });

  it("funciona com certificado AES-256 (padrão ICP-Brasil moderno)", () => {
    const pfx = generateTestPfx("senha123", "TESTE MEI:12345678000190", "aes256");
    const cert = parsePfx(pfx, "senha123");
    expect(cert.cnpjCpf).toBe("12345678000190");
    const xml = buildDpsXml(makeMinimalDps());
    const signed = signDps({
      xml,
      privateKeyPem: cert.privateKeyPem,
      certPem: cert.certPem,
    });
    expect(signed).toContain("<Signature");
  });
});

describe("signDps — validação via xmlsec1", () => {
  let xmlsec1Available = false;

  beforeAll(() => {
    try {
      execSync("xmlsec1 --version", { stdio: "pipe" });
      xmlsec1Available = true;
    } catch {
      xmlsec1Available = false;
    }
  });

  it("a assinatura é verificada por xmlsec1 usando o cert embedado", () => {
    if (!xmlsec1Available) {
      console.warn("xmlsec1 não disponível, skipping");
      return;
    }

    const pfx = generateTestPfx("senha123");
    const cert = parsePfx(pfx, "senha123");
    const xml = buildDpsXml(makeMinimalDps());
    const signed = signDps({
      xml,
      privateKeyPem: cert.privateKeyPem,
      certPem: cert.certPem,
    });

    const tmpXml = path.join(os.tmpdir(), `nexus-nfe-signed-${Date.now()}.xml`);
    const tmpCert = path.join(os.tmpdir(), `nexus-nfe-cert-${Date.now()}.pem`);
    fs.writeFileSync(tmpXml, signed, "utf-8");
    fs.writeFileSync(tmpCert, cert.certPem, "utf-8");

    try {
      // Usa --trusted-pem pra confiar no self-signed cert
      execSync(
        `xmlsec1 --verify --trusted-pem "${tmpCert}" --id-attr:Id "infDPS" "${tmpXml}"`,
        { stdio: "pipe" }
      );
      expect(true).toBe(true);
    } catch (error) {
      const stderr =
        error instanceof Error && "stderr" in error
          ? String((error as { stderr: Buffer }).stderr)
          : String(error);
      // Salva o XML pra debug
      const debugFile = path.resolve(
        __dirname,
        "./fixtures/last-failed-signed-dps.xml"
      );
      fs.mkdirSync(path.dirname(debugFile), { recursive: true });
      fs.writeFileSync(debugFile, signed, "utf-8");
      throw new Error(`xmlsec1 verify falhou:\n${stderr}`);
    } finally {
      try {
        fs.unlinkSync(tmpXml);
        fs.unlinkSync(tmpCert);
      } catch {
        /* ignore */
      }
    }
  });
});
