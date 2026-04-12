import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { buildDpsXml } from "../xml-builder";
import { buildIdDps } from "../dps-id";
import type { Dps, InfDps, Tomador } from "../types";

const SCHEMA_PATH = path.resolve(
  __dirname,
  "../../../../docs/nfse/reference/schemas-patched/Schemas/1.01/DPS_v1.01.xsd"
);

// --- Helpers ---

function makeBaseDps(overrides?: Partial<InfDps>): Dps {
  const idDps = buildIdDps({
    codigoLocalEmissao: "5300108",
    tipoInscricao: 1,
    inscricaoFederal: "12345678000190",
    serie: "1",
    numero: "1",
  });

  const base: InfDps = {
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
        descricao: "Consultoria em tecnologia da informacao",
      },
    },
    valores: {
      valorServico: 1500.0,
      aliquotaIss: 2.0,
      tributacaoIssqn: 1,
    },
    ...overrides,
  };

  return { versao: "1.00", infDps: base };
}

function validateXsd(xml: string): void {
  const tmpFile = path.join(os.tmpdir(), `nexus-nfe-ext-${Date.now()}.xml`);
  fs.writeFileSync(tmpFile, xml, "utf-8");
  try {
    execSync(`xmllint --noout --schema "${SCHEMA_PATH}" "${tmpFile}"`, {
      stdio: "pipe",
    });
  } catch (error) {
    const errMsg =
      error instanceof Error && "stderr" in error
        ? String((error as { stderr: Buffer }).stderr)
        : String(error);
    const debugFile = path.resolve(__dirname, "./fixtures/last-failed-extended-dps.xml");
    fs.mkdirSync(path.dirname(debugFile), { recursive: true });
    fs.writeFileSync(debugFile, xml, "utf-8");
    throw new Error(`Validação XSD falhou:\n${errMsg}`);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

// --- Setup ---

let xmllintAvailable = false;
let schemaAvailable = false;

beforeAll(() => {
  try {
    execSync("xmllint --version", { stdio: "pipe" });
    xmllintAvailable = true;
  } catch {
    xmllintAvailable = false;
  }
  schemaAvailable = fs.existsSync(SCHEMA_PATH);
});

function skipIfUnavailable() {
  if (!xmllintAvailable) {
    console.warn("xmllint não disponível, skipping");
    return true;
  }
  if (!schemaAvailable) {
    console.warn(`Schema não encontrado em ${SCHEMA_PATH}, skipping`);
    return true;
  }
  return false;
}

// --- Testes ---

describe("buildDpsXml — cenários XSD expandidos", () => {
  it("1. Tomador PJ com CNPJ e endereço nacional com complemento", () => {
    if (skipIfUnavailable()) return;

    const tomadorPj: Tomador = {
      tipoDocumento: "cnpj",
      documento: "98765432000100",
      nome: "EMPRESA TOMADORA SA",
      endereco: {
        tipo: "nacional",
        cep: "01310100",
        logradouro: "Av Paulista",
        numero: "1000",
        complemento: "Sala 501",
        bairro: "Bela Vista",
        municipioIbge: "3550308",
      },
    };

    const xml = buildDpsXml(makeBaseDps({ tomador: tomadorPj }));
    expect(xml).toContain("<CNPJ>98765432000100</CNPJ>");
    expect(xml).toContain("<xCpl>Sala 501</xCpl>");
    validateXsd(xml);
  });

  it("2. Tomador PF com endereço nacional + email + telefone", () => {
    if (skipIfUnavailable()) return;

    const tomadorPf: Tomador = {
      tipoDocumento: "cpf",
      documento: "98765432100",
      nome: "Maria Oliveira",
      endereco: {
        tipo: "nacional",
        cep: "20040020",
        logradouro: "Rua da Quitanda",
        numero: "42",
        bairro: "Centro",
        municipioIbge: "3304557",
      },
      email: "maria@example.com",
      telefone: "21999998888",
    };

    const xml = buildDpsXml(makeBaseDps({ tomador: tomadorPf }));
    expect(xml).toContain("<CPF>98765432100</CPF>");
    expect(xml).toContain("<email>maria@example.com</email>");
    expect(xml).toContain("<fone>21999998888</fone>");
    validateXsd(xml);
  });

  it("3. Sem tomador (tomador ausente do XML)", () => {
    if (skipIfUnavailable()) return;

    const xml = buildDpsXml(makeBaseDps({ tomador: undefined }));
    expect(xml).not.toContain("<toma>");
    validateXsd(xml);
  });

  it("4. Com intermediário (CNPJ)", () => {
    if (skipIfUnavailable()) return;

    const xml = buildDpsXml(
      makeBaseDps({
        intermediario: {
          tipoDocumento: "cnpj",
          documento: "11222333000181",
          nome: "INTERMEDIADORA DE SERVICOS LTDA",
        },
      })
    );
    expect(xml).toContain("<interm>");
    expect(xml).toContain("<CNPJ>11222333000181</CNPJ>");
    validateXsd(xml);
  });

  it("5. Com substituição (chSubstda + cMotivo + xMotivo)", () => {
    if (skipIfUnavailable()) return;

    const xml = buildDpsXml(
      makeBaseDps({
        substituicao: {
          chaveSubstituida: "12345678901234567890123456789012345678901234567890",
          codigoMotivo: "99",
          descricaoMotivo: "Correcao de dados",
        },
      })
    );
    expect(xml).toContain("<subst>");
    expect(xml).toContain("<chSubstda>12345678901234567890123456789012345678901234567890</chSubstda>");
    expect(xml).toContain("<cMotivo>99</cMotivo>");
    expect(xml).toContain("<xMotivo>Correcao de dados</xMotivo>");
    validateXsd(xml);
  });

  it("6. Com código NBS (cNBS)", () => {
    if (skipIfUnavailable()) return;

    const xml = buildDpsXml(
      makeBaseDps({
        servico: {
          localPrestacao: { municipioIbge: "5300108" },
          codigoServico: {
            codigoTributacaoNacional: "010101",
            descricao: "Servico de consultoria",
            codigoNbs: "101010100",
          },
        },
      })
    );
    expect(xml).toContain("<cNBS>101010100</cNBS>");
    validateXsd(xml);
  });

  it("7. Com código de tributação municipal (cTribMun)", () => {
    if (skipIfUnavailable()) return;

    const xml = buildDpsXml(
      makeBaseDps({
        servico: {
          localPrestacao: { municipioIbge: "5300108" },
          codigoServico: {
            codigoTributacaoNacional: "010101",
            codigoTributacaoMunicipal: "010",
            descricao: "Consultoria em TI",
          },
        },
      })
    );
    expect(xml).toContain("<cTribMun>");
    validateXsd(xml);
  });

  it("8. Prestador sem endereço", () => {
    if (skipIfUnavailable()) return;

    const xml = buildDpsXml(
      makeBaseDps({
        prestador: {
          tipoDocumento: "cnpj",
          documento: "12345678000190",
          nome: "TESTE MEI LTDA",
          // sem endereco
          regimeTributario: {
            opcaoSimplesNacional: 2,
            regimeEspecialTributacao: 0,
          },
        },
      })
    );
    // Nenhum elemento <end> no prestador
    expect(xml).not.toContain("<end>");
    validateXsd(xml);
  });
});
