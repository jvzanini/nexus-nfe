import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { buildDpsXml } from "../xml-builder";
import { buildIdDps } from "../dps-id";
import type { Dps } from "../types";

// Usa o schema PATCHED localmente — o schema oficial tem um bug no pattern
// do TSSerieDPS (usa ^ e $ como anchors, que são literais em XSD regex).
// Ver: docs/nfse/reference/spike-findings.md
const SCHEMA_PATH = path.resolve(
  __dirname,
  "../../../../docs/nfse/reference/schemas-patched/Schemas/1.01/DPS_v1.01.xsd"
);

function makeMinimalDps(): Dps {
  // Elementos XML <serie> e <nDPS> usam valores UNPADDED (padrão XSD rejeita
  // zeros à esquerda em nDPS). buildIdDps padroniza internamente.
  const idDps = buildIdDps({
    codigoLocalEmissao: "5300108",
    tipoInscricao: 1,
    inscricaoFederal: "12345678000190",
    serie: "1",
    numero: "1",
  });

  return {
    versao: "1.00",
    infDps: {
      id: idDps,
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
          opcaoSimplesNacional: 2, // MEI
          regimeEspecialTributacao: 0,
        },
      },
      tomador: {
        tipoDocumento: "cpf",
        documento: "12345678909",
        nome: "Joao da Silva",
      },
      servico: {
        localPrestacao: {
          municipioIbge: "5300108",
        },
        codigoServico: {
          codigoTributacaoNacional: "010101",
          descricao: "Consultoria em tecnologia da informacao",
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

describe("buildDpsXml — estrutura básica", () => {
  it("gera XML com declaração e namespace correto", () => {
    const xml = buildDpsXml(makeMinimalDps());
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('xmlns="http://www.sped.fazenda.gov.br/nfse"');
    expect(xml).toContain('versao="1.00"');
  });

  it("inclui o atributo Id no elemento infDPS", () => {
    const xml = buildDpsXml(makeMinimalDps());
    expect(xml).toMatch(/infDPS\s+Id="DPS\d{42}"/);
  });

  it("inclui o CNPJ do prestador dentro de prest", () => {
    const xml = buildDpsXml(makeMinimalDps());
    expect(xml).toContain("<CNPJ>12345678000190</CNPJ>");
  });

  it("inclui regTrib com opSimpNac=2 (MEI)", () => {
    const xml = buildDpsXml(makeMinimalDps());
    expect(xml).toContain("<opSimpNac>2</opSimpNac>");
    expect(xml).toContain("<regEspTrib>0</regEspTrib>");
  });

  it("formata valor do serviço com 2 casas decimais", () => {
    const xml = buildDpsXml(makeMinimalDps());
    expect(xml).toContain("<vServ>1500.00</vServ>");
  });

  it("formata dCompet no formato AAAA-MM-DD", () => {
    const xml = buildDpsXml(makeMinimalDps());
    expect(xml).toMatch(/<dCompet>\d{4}-\d{2}-\d{2}<\/dCompet>/);
  });

  it("formata dhEmi com timezone", () => {
    const xml = buildDpsXml(makeMinimalDps());
    expect(xml).toMatch(/<dhEmi>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00<\/dhEmi>/);
  });
});

describe("buildDpsXml — validação XSD via xmllint", () => {
  let xmllintAvailable = false;

  beforeAll(() => {
    try {
      execSync("xmllint --version", { stdio: "pipe" });
      xmllintAvailable = true;
    } catch {
      xmllintAvailable = false;
    }
  });

  it("passa na validação contra DPS_v1.01.xsd", () => {
    if (!xmllintAvailable) {
      console.warn("xmllint não disponível, skipping");
      return;
    }
    if (!fs.existsSync(SCHEMA_PATH)) {
      console.warn(`Schema não encontrado em ${SCHEMA_PATH}, skipping`);
      return;
    }

    const xml = buildDpsXml(makeMinimalDps());
    const tmpFile = path.join(os.tmpdir(), `nexus-nfe-spike-${Date.now()}.xml`);
    fs.writeFileSync(tmpFile, xml, "utf-8");

    try {
      execSync(`xmllint --noout --schema "${SCHEMA_PATH}" "${tmpFile}"`, {
        stdio: "pipe",
      });
      // Se chegou aqui, validou
      expect(true).toBe(true);
    } catch (error) {
      const errMsg =
        error instanceof Error && "stderr" in error
          ? String((error as { stderr: Buffer }).stderr)
          : String(error);
      // Salva o XML gerado num arquivo permanente pra inspeção
      const debugFile = path.resolve(
        __dirname,
        "./fixtures/last-failed-dps.xml"
      );
      fs.mkdirSync(path.dirname(debugFile), { recursive: true });
      fs.writeFileSync(debugFile, xml, "utf-8");
      console.error(`XML salvo em ${debugFile} pra debug`);
      console.error(`xmllint erro:\n${errMsg}`);
      throw new Error(`Validação XSD falhou:\n${errMsg}`);
    } finally {
      try {
        fs.unlinkSync(tmpFile);
      } catch {
        /* ignore */
      }
    }
  });
});
