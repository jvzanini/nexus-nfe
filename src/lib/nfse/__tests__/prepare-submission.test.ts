import { describe, it, expect } from "vitest";
import * as forge from "node-forge";
import { prepareSubmission } from "../prepare-submission";
import { buildIdDps } from "../dps-id";
import { unpackDps } from "../pack";
import type { Dps } from "../types";

function generateTestPfx(
  password: string,
  cnpj = "12345678000190"
): Buffer {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 1);
  const attrs = [
    { name: "commonName", value: `TESTE MEI:${cnpj}` },
    { name: "countryName", value: "BR" },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, {
    algorithm: "3des",
  });
  return Buffer.from(forge.asn1.toDer(p12Asn1).getBytes(), "binary");
}

function makeMinimalDps(cnpj = "12345678000190"): Dps {
  return {
    versao: "1.00",
    infDps: {
      id: buildIdDps({
        codigoLocalEmissao: "5300108",
        tipoInscricao: 1,
        inscricaoFederal: cnpj,
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
        documento: cnpj,
        nome: "TESTE MEI LTDA",
        endereco: {
          tipo: "nacional",
          cep: "70000000",
          logradouro: "SQS 308",
          numero: "100",
          bairro: "Asa Sul",
          municipioIbge: "5300108",
        },
        regimeTributario: { opcaoSimplesNacional: 2, regimeEspecialTributacao: 0 },
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
          descricao: "Consultoria",
        },
      },
      valores: { valorServico: 1500.0, aliquotaIss: 2.0, tributacaoIssqn: 1 },
    },
  };
}

describe("prepareSubmission", () => {
  it("retorna payload completo com idDps, xmlAssinado e dpsXmlGZipB64", () => {
    const pfx = generateTestPfx("senha123");
    const dps = makeMinimalDps();
    const result = prepareSubmission(dps, pfx, "senha123");

    expect(result.idDps).toBe(dps.infDps.id);
    expect(result.xmlAssinado).toContain("<Signature");
    expect(result.dpsXmlGZipB64).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    expect(result.certThumbprint).toMatch(/^[a-f0-9]{40}$/);
  });

  it("dpsXmlGZipB64 é o XML assinado comprimido (round-trip recupera)", () => {
    const pfx = generateTestPfx("senha123");
    const dps = makeMinimalDps();
    const result = prepareSubmission(dps, pfx, "senha123");
    const recovered = unpackDps(result.dpsXmlGZipB64);
    expect(recovered).toBe(result.xmlAssinado);
  });

  it("rejeita quando CNPJ do cert não bate com o do prestador", () => {
    const pfx = generateTestPfx("senha123", "99999999000199");
    const dps = makeMinimalDps("12345678000190");
    expect(() => prepareSubmission(dps, pfx, "senha123")).toThrow(
      /não confere/
    );
  });
});
