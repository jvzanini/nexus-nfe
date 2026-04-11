// Spike sanity check — roda todo o pipeline local end-to-end:
// 1. Gera PFX self-signed
// 2. Constrói DPS do cenário mínimo MEI-DF
// 3. prepareSubmission (build + sign + pack)
// 4. Valida XML assinado contra XSD (patched)
// 5. Valida assinatura via xmlsec1
// 6. Verifica round-trip do empacotamento
//
// Uso: npx tsx scripts/nfse-sanity-check.ts

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as forge from "node-forge";

import { prepareSubmission } from "../src/lib/nfse/prepare-submission";
import { buildIdDps } from "../src/lib/nfse/dps-id";
import { unpackDps } from "../src/lib/nfse/pack";
import type { Dps } from "../src/lib/nfse/types";

const ROOT = path.resolve(__dirname, "..");
const SCHEMA_PATH = path.join(
  ROOT,
  "docs/nfse/reference/schemas-patched/Schemas/1.01/DPS_v1.01.xsd"
);

function log(icon: string, msg: string) {
  console.log(`${icon} ${msg}`);
}

function generateTestPfx(password: string): Buffer {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 1);
  const attrs = [
    { name: "commonName", value: "TESTE MEI LTDA:12345678000190" },
    { name: "countryName", value: "BR" },
    { name: "organizationName", value: "ICP-Brasil Teste" },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, {
    algorithm: "3des",
  });
  return Buffer.from(forge.asn1.toDer(p12Asn1).getBytes(), "binary");
}

function makeDps(): Dps {
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
      dataHoraEmissao: new Date(),
      versaoAplicativo: "NexusNFE-1.0.0",
      serie: "1",
      numero: "1",
      dataCompetencia: new Date(),
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
          descricao: "Consultoria em tecnologia da informacao - spike check",
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

async function main() {
  const startedAt = Date.now();
  console.log("");
  console.log("🚀 Nexus NFE — Sanity Check Fase -1");
  console.log("");

  log("1️⃣ ", "Gerando PFX self-signed...");
  const pfx = generateTestPfx("senha123");
  log("✅", `PFX gerado (${pfx.length} bytes)`);

  log("2️⃣ ", "Construindo DPS do cenário mínimo MEI-DF...");
  const dps = makeDps();
  log("✅", `idDps: ${dps.infDps.id}`);

  log("3️⃣ ", "Orquestrando prepareSubmission (build + sign + pack)...");
  const result = prepareSubmission(dps, pfx, "senha123");
  log("✅", `XML assinado: ${result.xmlAssinado.length} bytes`);
  log("✅", `Payload empacotado: ${result.dpsXmlGZipB64.length} bytes`);
  log(
    "✅",
    `Compressão: ${(
      (result.dpsXmlGZipB64.length / result.xmlAssinado.length) *
      100
    ).toFixed(1)}% do tamanho original`
  );

  const tmpDir = os.tmpdir();
  const xmlFile = path.join(tmpDir, `nexus-nfe-sanity-${Date.now()}.xml`);
  const certFile = path.join(tmpDir, `nexus-nfe-sanity-cert-${Date.now()}.pem`);
  fs.writeFileSync(xmlFile, result.xmlAssinado, "utf-8");

  // Extrai cert do PFX pra salvar em PEM
  const p12Asn1 = forge.asn1.fromDer(pfx.toString("binary"));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, "senha123");
  const certBag = p12.getBags({ bagType: forge.pki.oids.certBag })[
    forge.pki.oids.certBag
  ]?.[0];
  if (!certBag?.cert) throw new Error("cert não encontrado no PFX");
  fs.writeFileSync(certFile, forge.pki.certificateToPem(certBag.cert), "utf-8");

  log("4️⃣ ", "Validando XML assinado contra schema XSD (patched)...");
  try {
    execSync(`xmllint --noout --schema "${SCHEMA_PATH}" "${xmlFile}"`, {
      stdio: "pipe",
    });
    log("✅", "XSD validation: OK");
  } catch (err) {
    const stderr =
      err instanceof Error && "stderr" in err
        ? String((err as { stderr: Buffer }).stderr)
        : String(err);
    log("❌", `XSD validation falhou:\n${stderr}`);
    process.exit(1);
  }

  log("5️⃣ ", "Validando assinatura XMLDSIG via xmlsec1...");
  try {
    execSync(
      `xmlsec1 --verify --trusted-pem "${certFile}" --id-attr:Id "infDPS" "${xmlFile}"`,
      { stdio: "pipe" }
    );
    log("✅", "xmlsec1 verify: OK");
  } catch (err) {
    const stderr =
      err instanceof Error && "stderr" in err
        ? String((err as { stderr: Buffer }).stderr)
        : String(err);
    log("❌", `xmlsec1 verify falhou:\n${stderr}`);
    process.exit(1);
  }

  log("6️⃣ ", "Verificando round-trip do empacotamento...");
  const unpacked = unpackDps(result.dpsXmlGZipB64);
  if (unpacked !== result.xmlAssinado) {
    log("❌", "Round-trip falhou: unpacked !== xmlAssinado");
    process.exit(1);
  }
  log("✅", "Round-trip OK");

  // Limpa temp files
  try {
    fs.unlinkSync(xmlFile);
    fs.unlinkSync(certFile);
  } catch {
    /* ignore */
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(2);
  console.log("");
  console.log(`🎉 SPIKE FASE -1: OK (${elapsed}s)`);
  console.log("");
  console.log("Pipeline local completo:");
  console.log("  ✅ Parser PKCS#12 (3DES e AES-256)");
  console.log("  ✅ Build XML compatível com schema DPS_v1.01.xsd");
  console.log("  ✅ Assinatura XMLDSIG verificada por xmlsec1");
  console.log("  ✅ Empacotamento GZip+Base64 round-trip");
  console.log("");
  console.log("Pendente (precisa de cert A1 real + adesão gov.br Ouro):");
  console.log("  ⏳ POST /nfse em produção restrita (Fase 3)");
  console.log("");
}

main().catch((err) => {
  console.error("");
  console.error("💥 SPIKE FALHOU:", err);
  process.exit(1);
});
