import { describe, it, expect } from "vitest";
import { validateDps } from "../dps-validator";
import { buildIdDps } from "../dps-id";
import type { Dps } from "../types";

function makeValidId(): string {
  return buildIdDps({
    codigoLocalEmissao: "5300108",
    tipoInscricao: 1,
    inscricaoFederal: "12345678000190",
    serie: "1",
    numero: "1",
  });
}

function makeValidDps(): Dps {
  return {
    versao: "1.00",
    infDps: {
      id: makeValidId(),
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
        regimeTributario: {
          opcaoSimplesNacional: 2,
          regimeEspecialTributacao: 0,
        },
      },
      servico: {
        localPrestacao: { municipioIbge: "5300108" },
        codigoServico: {
          codigoTributacaoNacional: "010101",
          descricao: "Consultoria em tecnologia da informação",
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

describe("validateDps — DPS válido", () => {
  it("retorna success: true para DPS mínimo válido", () => {
    const result = validateDps(makeValidDps());
    expect(result.success).toBe(true);
    expect(result.errors).toBeUndefined();
  });
});

describe("validateDps — Id do DPS", () => {
  it("falha se id tiver menos de 45 caracteres", () => {
    const dps = makeValidDps();
    dps.infDps.id = "DPS123";
    const result = validateDps(dps);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("Id do DPS deve ter 45 caracteres");
  });

  it("falha se id tiver mais de 45 caracteres", () => {
    const dps = makeValidDps();
    dps.infDps.id = "A".repeat(46);
    const result = validateDps(dps);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("Id do DPS deve ter 45 caracteres");
  });
});

describe("validateDps — Valor do serviço", () => {
  it("falha se valorServico for zero", () => {
    const dps = makeValidDps();
    dps.infDps.valores.valorServico = 0;
    const result = validateDps(dps);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("Valor do serviço deve ser maior que zero");
  });

  it("falha se valorServico for negativo", () => {
    const dps = makeValidDps();
    dps.infDps.valores.valorServico = -100;
    const result = validateDps(dps);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("Valor do serviço deve ser maior que zero");
  });
});

describe("validateDps — Alíquota do ISS", () => {
  it("falha se aliquotaIss for negativa", () => {
    const dps = makeValidDps();
    dps.infDps.valores.aliquotaIss = -1;
    const result = validateDps(dps);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("Alíquota do ISS deve estar entre 0% e 100%");
  });

  it("falha se aliquotaIss for maior que 100", () => {
    const dps = makeValidDps();
    dps.infDps.valores.aliquotaIss = 101;
    const result = validateDps(dps);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("Alíquota do ISS deve estar entre 0% e 100%");
  });

  it("aceita aliquotaIss = 0 (isento)", () => {
    const dps = makeValidDps();
    dps.infDps.valores.aliquotaIss = 0;
    dps.infDps.valores.tributacaoIssqn = 3;
    const result = validateDps(dps);
    expect(result.success).toBe(true);
  });
});

describe("validateDps — Documento do prestador", () => {
  it("falha se documento do prestador for vazio", () => {
    const dps = makeValidDps();
    dps.infDps.prestador.documento = "";
    const result = validateDps(dps);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("Documento do prestador é obrigatório");
  });
});

describe("validateDps — Tomador", () => {
  it("falha se tomador presente mas nome estiver vazio", () => {
    const dps = makeValidDps();
    dps.infDps.tomador = {
      tipoDocumento: "cpf",
      documento: "12345678909",
      nome: "",
    };
    const result = validateDps(dps);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("Nome do tomador é obrigatório quando tomador está presente");
  });

  it("falha se tomador presente mas nome for apenas espaços", () => {
    const dps = makeValidDps();
    dps.infDps.tomador = {
      tipoDocumento: "cpf",
      documento: "12345678909",
      nome: "   ",
    };
    const result = validateDps(dps);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("Nome do tomador é obrigatório quando tomador está presente");
  });

  it("falha se tomador presente mas documento estiver vazio", () => {
    const dps = makeValidDps();
    dps.infDps.tomador = {
      tipoDocumento: "cpf",
      documento: "",
      nome: "João da Silva",
    };
    const result = validateDps(dps);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("Documento do tomador é obrigatório");
  });

  it("aceita tomador PJ (CNPJ) válido", () => {
    const dps = makeValidDps();
    dps.infDps.tomador = {
      tipoDocumento: "cnpj",
      documento: "98765432000101",
      nome: "Empresa Tomadora LTDA",
    };
    const result = validateDps(dps);
    expect(result.success).toBe(true);
  });

  it("aceita tomador com endereço nacional", () => {
    const dps = makeValidDps();
    dps.infDps.tomador = {
      tipoDocumento: "cpf",
      documento: "12345678909",
      nome: "João da Silva",
      endereco: {
        tipo: "nacional",
        cep: "70000001",
        logradouro: "SQN 105 Bloco D",
        numero: "10",
        bairro: "Asa Norte",
        municipioIbge: "5300108",
      },
    };
    const result = validateDps(dps);
    expect(result.success).toBe(true);
  });

  it("não valida tomador se ausente", () => {
    const dps = makeValidDps();
    delete dps.infDps.tomador;
    const result = validateDps(dps);
    expect(result.success).toBe(true);
  });
});

describe("validateDps — Código de serviço", () => {
  it("falha se codigoTributacaoNacional estiver vazio", () => {
    const dps = makeValidDps();
    dps.infDps.servico.codigoServico.codigoTributacaoNacional = "";
    const result = validateDps(dps);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("Código de tributação nacional é obrigatório");
  });

  it("falha se descricao do serviço estiver vazia", () => {
    const dps = makeValidDps();
    dps.infDps.servico.codigoServico.descricao = "";
    const result = validateDps(dps);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("Descrição do serviço é obrigatória");
  });

  it("falha se descricao do serviço for apenas espaços", () => {
    const dps = makeValidDps();
    dps.infDps.servico.codigoServico.descricao = "   ";
    const result = validateDps(dps);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("Descrição do serviço é obrigatória");
  });
});

describe("validateDps — Município IBGE", () => {
  it("falha se municipioIbge tiver menos de 7 dígitos", () => {
    const dps = makeValidDps();
    dps.infDps.servico.localPrestacao.municipioIbge = "530010";
    const result = validateDps(dps);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("Código IBGE do local de prestação deve ter 7 dígitos");
  });

  it("falha se municipioIbge contiver letras", () => {
    const dps = makeValidDps();
    dps.infDps.servico.localPrestacao.municipioIbge = "530010A";
    const result = validateDps(dps);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("Código IBGE do local de prestação deve ter 7 dígitos");
  });
});

describe("validateDps — Retenção ISS", () => {
  it("aceita valorIssRetido válido (menor que valorServico)", () => {
    const dps = makeValidDps();
    dps.infDps.valores.valorIssRetido = 30.0;
    const result = validateDps(dps);
    expect(result.success).toBe(true);
  });

  it("falha se valorIssRetido for maior que valorServico", () => {
    const dps = makeValidDps();
    dps.infDps.valores.valorIssRetido = 2000.0;
    const result = validateDps(dps);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("Valor de ISS retido não pode ser maior que o valor do serviço");
  });

  it("falha se valorIssRetido for negativo", () => {
    const dps = makeValidDps();
    dps.infDps.valores.valorIssRetido = -10;
    const result = validateDps(dps);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("Valor de ISS retido não pode ser negativo");
  });
});

describe("validateDps — Deduções", () => {
  it("falha se valorDeducoes for negativo", () => {
    const dps = makeValidDps();
    dps.infDps.valores.valorDeducoes = -50;
    const result = validateDps(dps);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("Valor de deduções não pode ser negativo");
  });

  it("aceita valorDeducoes = 0", () => {
    const dps = makeValidDps();
    dps.infDps.valores.valorDeducoes = 0;
    const result = validateDps(dps);
    expect(result.success).toBe(true);
  });
});

describe("validateDps — Substituição", () => {
  it("aceita DPS com substituição preenchida", () => {
    const dps = makeValidDps();
    dps.infDps.substituicao = {
      chaveSubstituida: "NFSe" + "0".repeat(40),
      codigoMotivo: "01",
      descricaoMotivo: "Erro nos dados do tomador",
    };
    const result = validateDps(dps);
    expect(result.success).toBe(true);
  });
});

describe("validateDps — Múltiplos erros", () => {
  it("retorna todos os erros quando múltiplos campos são inválidos", () => {
    const dps = makeValidDps();
    dps.infDps.id = "INVALIDO";
    dps.infDps.valores.valorServico = 0;
    dps.infDps.valores.aliquotaIss = 150;
    const result = validateDps(dps);
    expect(result.success).toBe(false);
    expect(result.errors!.length).toBeGreaterThanOrEqual(3);
    expect(result.error).toBe(result.errors![0]);
  });
});
