import { describe, it, expect } from "vitest";
import {
  isValidCnpj,
  cnpjSchema,
  cepSchema,
  ufSchema,
  municipioIbgeSchema,
  serieDpsSchema,
  createClienteMeiSchema,
} from "../cliente-mei";

describe("isValidCnpj", () => {
  it("aceita CNPJs válidos conhecidos", () => {
    expect(isValidCnpj("11222333000181")).toBe(true);
    expect(isValidCnpj("04252011000110")).toBe(true); // Banco do Brasil histórico
    expect(isValidCnpj("33000167000101")).toBe(true); // Petrobras histórico
  });

  it("rejeita dígitos verificadores errados", () => {
    expect(isValidCnpj("11222333000180")).toBe(false);
    expect(isValidCnpj("11222333000182")).toBe(false);
  });

  it("rejeita tamanho incorreto", () => {
    expect(isValidCnpj("1122233300018")).toBe(false);
    expect(isValidCnpj("112223330001811")).toBe(false);
    expect(isValidCnpj("")).toBe(false);
  });

  it("rejeita CNPJs com todos dígitos iguais", () => {
    expect(isValidCnpj("00000000000000")).toBe(false);
    expect(isValidCnpj("11111111111111")).toBe(false);
    expect(isValidCnpj("99999999999999")).toBe(false);
  });

  it("aceita CNPJ formatado com máscara", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
  });
});

describe("cnpjSchema", () => {
  it("normaliza removendo máscara", () => {
    const r = cnpjSchema.parse("11.222.333/0001-81");
    expect(r).toBe("11222333000181");
  });

  it("rejeita CNPJ inválido com mensagem", () => {
    const r = cnpjSchema.safeParse("11222333000180");
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toMatch(/CNPJ inválido/i);
    }
  });
});

describe("cepSchema", () => {
  it("normaliza CEP com hífen", () => {
    expect(cepSchema.parse("70000-000")).toBe("70000000");
  });

  it("rejeita CEP curto", () => {
    expect(cepSchema.safeParse("7000").success).toBe(false);
  });
});

describe("ufSchema", () => {
  it("converte pra maiúsculas", () => {
    expect(ufSchema.parse("df")).toBe("DF");
  });

  it("rejeita UF com 3 caracteres", () => {
    expect(ufSchema.safeParse("DFS").success).toBe(false);
  });
});

describe("municipioIbgeSchema", () => {
  it("aceita código IBGE de 7 dígitos", () => {
    expect(municipioIbgeSchema.parse("5300108")).toBe("5300108");
  });

  it("rejeita código com 6 dígitos", () => {
    expect(municipioIbgeSchema.safeParse("530010").success).toBe(false);
  });
});

describe("serieDpsSchema", () => {
  it("zero-preenche série até 5 dígitos", () => {
    expect(serieDpsSchema.parse("1")).toBe("00001");
    expect(serieDpsSchema.parse("123")).toBe("00123");
    expect(serieDpsSchema.parse("00001")).toBe("00001");
  });

  it("rejeita série não-numérica", () => {
    expect(serieDpsSchema.safeParse("A001").success).toBe(false);
  });

  it("rejeita série com mais de 5 dígitos", () => {
    expect(serieDpsSchema.safeParse("123456").success).toBe(false);
  });
});

describe("createClienteMeiSchema", () => {
  const validInput = {
    cnpj: "11.222.333/0001-81",
    razaoSocial: "João Silva MEI",
    cep: "70000-000",
    logradouro: "SQN 308 Bl A",
    numero: "101",
    bairro: "Asa Norte",
    municipioIbge: "5300108",
    uf: "DF",
    serieDpsAtual: "1",
  };

  it("aceita input válido e normaliza", () => {
    const r = createClienteMeiSchema.parse(validInput);
    expect(r.cnpj).toBe("11222333000181");
    expect(r.cep).toBe("70000000");
    expect(r.uf).toBe("DF");
    expect(r.serieDpsAtual).toBe("00001");
    expect(r.nomeFantasia).toBeUndefined();
  });

  it("aplica default na série DPS quando omitida", () => {
    const { serieDpsAtual, ...rest } = validInput;
    const r = createClienteMeiSchema.parse(rest);
    expect(r.serieDpsAtual).toBe("00001");
  });

  it("aceita strings vazias em opcionais e transforma em undefined", () => {
    const r = createClienteMeiSchema.parse({
      ...validInput,
      nomeFantasia: "",
      email: "",
      telefone: "",
      complemento: "",
      inscricaoMunicipal: "",
      codigoServicoPadrao: "",
    });
    expect(r.nomeFantasia).toBeUndefined();
    expect(r.email).toBeUndefined();
  });

  it("valida e-mail quando informado", () => {
    const r = createClienteMeiSchema.safeParse({
      ...validInput,
      email: "nao-e-email",
    });
    expect(r.success).toBe(false);
  });

  it("rejeita razão social vazia", () => {
    const r = createClienteMeiSchema.safeParse({
      ...validInput,
      razaoSocial: "",
    });
    expect(r.success).toBe(false);
  });
});
