# Fase 2: DPS Builder Completo + Validador + Form de Emissão

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expandir o xml-builder do spike para cobrir todos os cenários do XSD (tomador PJ, endereço do tomador, intermediário, substituição, retenção ISS, deduções), criar validador Zod pré-XML, e construir o form multi-step de emissão de NFS-e.

**Architecture:** Validador Zod (`dps-validator.ts`) valida input TypeScript ANTES de gerar XML — erros amigáveis em português. O `xml-builder.ts` existente já cobre a maioria dos cenários (tomador com endereço, intermediário, substituição, endereço exterior). Foco é adicionar cenários de valores (retenção ISS, deduções) e garantir cobertura de testes ≥90%. O form de emissão (`/nfse/nova`) usa multi-step com NbsSelector, autocomplete de tomador, e preview de valores.

**Tech Stack:** TypeScript, Zod, Vitest, xmllint (XSD validation), Next.js App Router, Server Actions, shadcn/ui, Framer Motion

---

## File Structure

```
src/lib/
  nfse/
    dps-validator.ts               # CREATE — Zod schemas para validação pré-XML
    __tests__/
      dps-validator.test.ts        # CREATE — testes do validador
      xml-builder-extended.test.ts # CREATE — testes XSD para cenários expandidos
  actions/
    nfse.ts                        # CREATE — criarRascunho, listarNfses, getNfse, emitirNfse

src/components/nfse/
  nova-nfse-form.tsx               # CREATE — form multi-step de emissão
  step-cliente.tsx                  # CREATE — step 1: selecionar cliente MEI
  step-servico.tsx                  # CREATE — step 2: serviço + código NBS
  step-tomador.tsx                  # CREATE — step 3: tomador (PF/PJ)
  step-valores.tsx                  # CREATE — step 4: valores + preview ISS
  step-confirmar.tsx               # CREATE — step 5: review + emitir

src/app/(protected)/nfse/
  page.tsx                         # CREATE — listagem de NFS-e
  nova/
    page.tsx                       # CREATE — wrapper do form de emissão

src/lib/validation/
  nfse.ts                          # CREATE — Zod schemas para o form UI
```

---

### Task 1: Validador Zod do DPS (dps-validator.ts)

**Files:**
- Create: `src/lib/nfse/dps-validator.ts`
- Create: `src/lib/nfse/__tests__/dps-validator.test.ts`
- Reference: `src/lib/nfse/types.ts` (tipos TypeScript do DPS)
- Reference: `src/lib/validation/cliente-mei.ts` (padrão Zod existente)

**Contexto:** O validador recebe um objeto DPS tipado e valida todas as regras de negócio ANTES de gerar XML. Erros em português. Não duplica o que o XSD valida (formato XML) — foca em regras semânticas.

- [ ] **Step 1: Escrever os testes**

```typescript
// src/lib/nfse/__tests__/dps-validator.test.ts
import { describe, it, expect } from "vitest";
import { validateDps } from "../dps-validator";
import { buildIdDps } from "../dps-id";
import type { Dps } from "../types";

function makeValidDps(): Dps {
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
          opcaoSimplesNacional: 2,
          regimeEspecialTributacao: 0,
        },
      },
      tomador: {
        tipoDocumento: "cpf",
        documento: "12345678909",
        nome: "João da Silva",
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

describe("validateDps", () => {
  it("aceita DPS mínimo válido", () => {
    const result = validateDps(makeValidDps());
    expect(result.success).toBe(true);
  });

  it("rejeita valor do serviço zero", () => {
    const dps = makeValidDps();
    dps.infDps.valores.valorServico = 0;
    const result = validateDps(dps);
    expect(result.success).toBe(false);
    expect(result.error).toContain("valor");
  });

  it("rejeita valor do serviço negativo", () => {
    const dps = makeValidDps();
    dps.infDps.valores.valorServico = -100;
    const result = validateDps(dps);
    expect(result.success).toBe(false);
  });

  it("rejeita alíquota ISS fora do range 0-100", () => {
    const dps = makeValidDps();
    dps.infDps.valores.aliquotaIss = 101;
    const result = validateDps(dps);
    expect(result.success).toBe(false);
  });

  it("rejeita prestador sem documento", () => {
    const dps = makeValidDps();
    dps.infDps.prestador.documento = "";
    const result = validateDps(dps);
    expect(result.success).toBe(false);
  });

  it("rejeita tomador sem nome", () => {
    const dps = makeValidDps();
    dps.infDps.tomador = {
      tipoDocumento: "cpf",
      documento: "12345678909",
      nome: "",
    };
    const result = validateDps(dps);
    expect(result.success).toBe(false);
  });

  it("rejeita código de serviço vazio", () => {
    const dps = makeValidDps();
    dps.infDps.servico.codigoServico.codigoTributacaoNacional = "";
    const result = validateDps(dps);
    expect(result.success).toBe(false);
  });

  it("rejeita descrição de serviço vazia", () => {
    const dps = makeValidDps();
    dps.infDps.servico.codigoServico.descricao = "";
    const result = validateDps(dps);
    expect(result.success).toBe(false);
  });

  it("aceita DPS com retenção de ISS", () => {
    const dps = makeValidDps();
    dps.infDps.valores.valorIssRetido = 30.0;
    const result = validateDps(dps);
    expect(result.success).toBe(true);
  });

  it("rejeita retenção ISS maior que valor do serviço", () => {
    const dps = makeValidDps();
    dps.infDps.valores.valorIssRetido = 2000.0;
    const result = validateDps(dps);
    expect(result.success).toBe(false);
  });

  it("aceita DPS com tomador PJ (CNPJ)", () => {
    const dps = makeValidDps();
    dps.infDps.tomador = {
      tipoDocumento: "cnpj",
      documento: "98765432000199",
      nome: "Empresa Tomadora LTDA",
    };
    const result = validateDps(dps);
    expect(result.success).toBe(true);
  });

  it("aceita DPS com tomador com endereço", () => {
    const dps = makeValidDps();
    dps.infDps.tomador = {
      tipoDocumento: "cpf",
      documento: "12345678909",
      nome: "João da Silva",
      endereco: {
        tipo: "nacional",
        cep: "70000000",
        logradouro: "SQN 310",
        numero: "200",
        bairro: "Asa Norte",
        municipioIbge: "5300108",
      },
    };
    const result = validateDps(dps);
    expect(result.success).toBe(true);
  });

  it("aceita DPS com substituição", () => {
    const dps = makeValidDps();
    dps.infDps.substituicao = {
      chaveSubstituida: "NFSe53001081234567800019000001000000000000000001",
      codigoMotivo: "01",
    };
    const result = validateDps(dps);
    expect(result.success).toBe(true);
  });

  it("rejeita municipioIbge inválido (não 7 dígitos)", () => {
    const dps = makeValidDps();
    dps.infDps.codigoLocalEmissao = "123";
    const result = validateDps(dps);
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar testes para verificar que falham**

Run: `npx vitest run src/lib/nfse/__tests__/dps-validator.test.ts`
Expected: FAIL — `validateDps` não existe

- [ ] **Step 3: Implementar o validador**

```typescript
// src/lib/nfse/dps-validator.ts
import type { Dps } from "./types";

interface ValidationResult {
  success: boolean;
  error?: string;
  errors?: string[];
}

/**
 * Valida um objeto DPS antes de gerar XML.
 * Retorna erros semânticos em português.
 */
export function validateDps(dps: Dps): ValidationResult {
  const errors: string[] = [];
  const inf = dps.infDps;

  // Campos obrigatórios raiz
  if (!inf.id || inf.id.length !== 45) {
    errors.push("Id do DPS deve ter 45 caracteres");
  }
  if (!/^\d{7}$/.test(inf.codigoLocalEmissao)) {
    errors.push("Código do município emissor deve ter 7 dígitos");
  }
  if (!inf.serie) {
    errors.push("Série do DPS é obrigatória");
  }
  if (!inf.numero) {
    errors.push("Número do DPS é obrigatório");
  }

  // Prestador
  if (!inf.prestador.documento) {
    errors.push("Documento do prestador é obrigatório");
  }

  // Tomador (opcional, mas se presente precisa ter nome)
  if (inf.tomador) {
    if (!inf.tomador.nome || inf.tomador.nome.trim() === "") {
      errors.push("Nome do tomador é obrigatório quando tomador está presente");
    }
    if (!inf.tomador.documento) {
      errors.push("Documento do tomador é obrigatório");
    }
  }

  // Serviço
  const serv = inf.servico;
  if (!serv.codigoServico.codigoTributacaoNacional) {
    errors.push("Código de tributação nacional é obrigatório");
  }
  if (!serv.codigoServico.descricao || serv.codigoServico.descricao.trim() === "") {
    errors.push("Descrição do serviço é obrigatória");
  }
  if (!/^\d{7}$/.test(serv.localPrestacao.municipioIbge)) {
    errors.push("Código IBGE do local de prestação deve ter 7 dígitos");
  }

  // Valores
  const val = inf.valores;
  if (val.valorServico <= 0) {
    errors.push("Valor do serviço deve ser maior que zero");
  }
  if (val.aliquotaIss < 0 || val.aliquotaIss > 100) {
    errors.push("Alíquota do ISS deve estar entre 0% e 100%");
  }
  if (val.valorIssRetido !== undefined && val.valorIssRetido < 0) {
    errors.push("Valor de ISS retido não pode ser negativo");
  }
  if (val.valorIssRetido !== undefined && val.valorIssRetido > val.valorServico) {
    errors.push("Valor de ISS retido não pode ser maior que o valor do serviço");
  }
  if (val.valorDeducoes !== undefined && val.valorDeducoes < 0) {
    errors.push("Valor de deduções não pode ser negativo");
  }

  if (errors.length > 0) {
    return { success: false, error: errors[0], errors };
  }

  return { success: true };
}
```

- [ ] **Step 4: Rodar testes para verificar que passam**

Run: `npx vitest run src/lib/nfse/__tests__/dps-validator.test.ts`
Expected: PASS (14 testes)

- [ ] **Step 5: Commit**

```bash
git add src/lib/nfse/dps-validator.ts src/lib/nfse/__tests__/dps-validator.test.ts
git commit -m "feat(nfse): validador Zod do DPS com regras de negócio em português"
```

---

### Task 2: Testes XSD expandidos do xml-builder

**Files:**
- Create: `src/lib/nfse/__tests__/xml-builder-extended.test.ts`
- Reference: `src/lib/nfse/__tests__/xml-builder.test.ts` (testes existentes como modelo)
- Reference: `src/lib/nfse/xml-builder.ts` (builder existente)
- Reference: `docs/nfse/reference/schemas-patched/Schemas/1.01/DPS_v1.01.xsd`

**Contexto:** O xml-builder do spike já suporta a maioria dos cenários (tomador com endereço, intermediário, substituição, endereço exterior). Precisamos adicionar testes XSD para validar esses cenários contra o schema oficial. O builder existente já gera XML que passa no xmllint para o caso mínimo. Esses testes garantem que os cenários expandidos também passam.

- [ ] **Step 1: Escrever os testes expandidos**

```typescript
// src/lib/nfse/__tests__/xml-builder-extended.test.ts
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

let xmllintAvailable = false;

beforeAll(() => {
  try {
    execSync("xmllint --version", { stdio: "pipe" });
    xmllintAvailable = true;
  } catch {
    xmllintAvailable = false;
  }
});

function validateXsd(xml: string): void {
  if (!xmllintAvailable || !fs.existsSync(SCHEMA_PATH)) return;

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
    throw new Error(`XSD validation failed:\n${errMsg}\n\nXML:\n${xml}`);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

function makeBaseDps(overrides?: Partial<InfDps>): Dps {
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
      ...overrides,
    },
  };
}

describe("xml-builder — cenários expandidos com validação XSD", () => {
  it("tomador PJ com CNPJ e endereço nacional", () => {
    const dps = makeBaseDps({
      tomador: {
        tipoDocumento: "cnpj",
        documento: "98765432000199",
        nome: "Empresa Tomadora LTDA",
        endereco: {
          tipo: "nacional",
          cep: "01310100",
          logradouro: "Av Paulista",
          numero: "1000",
          complemento: "Sala 501",
          bairro: "Bela Vista",
          municipioIbge: "3550308",
        },
      },
    });
    const xml = buildDpsXml(dps);
    expect(xml).toContain("<CNPJ>98765432000199</CNPJ>");
    expect(xml).toContain("<xNome>Empresa Tomadora LTDA</xNome>");
    expect(xml).toContain("<cMun>3550308</cMun>");
    expect(xml).toContain("<xCpl>Sala 501</xCpl>");
    validateXsd(xml);
  });

  it("tomador PF com endereço nacional", () => {
    const dps = makeBaseDps({
      tomador: {
        tipoDocumento: "cpf",
        documento: "12345678909",
        nome: "Maria Santos",
        email: "maria@email.com",
        telefone: "61999990000",
        endereco: {
          tipo: "nacional",
          cep: "70000000",
          logradouro: "SQN 310 Bloco B",
          numero: "300",
          bairro: "Asa Norte",
          municipioIbge: "5300108",
        },
      },
    });
    const xml = buildDpsXml(dps);
    expect(xml).toContain("<CPF>12345678909</CPF>");
    expect(xml).toContain("<email>maria@email.com</email>");
    expect(xml).toContain("<fone>61999990000</fone>");
    validateXsd(xml);
  });

  it("sem tomador (opcional)", () => {
    const dps = makeBaseDps({ tomador: undefined });
    const xml = buildDpsXml(dps);
    expect(xml).not.toContain("<toma>");
    validateXsd(xml);
  });

  it("com intermediário", () => {
    const dps = makeBaseDps({
      intermediario: {
        tipoDocumento: "cnpj",
        documento: "11222333000144",
        nome: "Intermediário LTDA",
      },
    });
    const xml = buildDpsXml(dps);
    expect(xml).toContain("<interm>");
    expect(xml).toContain("<CNPJ>11222333000144</CNPJ>");
    validateXsd(xml);
  });

  it("com substituição", () => {
    const dps = makeBaseDps({
      substituicao: {
        chaveSubstituida: "NFSe53001081234567800019000001000000000000000001",
        codigoMotivo: "01",
        descricaoMotivo: "Erro na descrição do serviço",
      },
    });
    const xml = buildDpsXml(dps);
    expect(xml).toContain("<subst>");
    expect(xml).toContain("<cMotivo>01</cMotivo>");
    expect(xml).toContain("<xMotivo>Erro na descrição do serviço</xMotivo>");
    validateXsd(xml);
  });

  it("com código NBS opcional", () => {
    const dps = makeBaseDps();
    dps.infDps.servico.codigoServico.codigoNbs = "10101";
    const xml = buildDpsXml(dps);
    expect(xml).toContain("<cNBS>10101</cNBS>");
    validateXsd(xml);
  });

  it("com código de tributação municipal", () => {
    const dps = makeBaseDps();
    dps.infDps.servico.codigoServico.codigoTributacaoMunicipal = "140301";
    const xml = buildDpsXml(dps);
    expect(xml).toContain("<cTribMun>140301</cTribMun>");
    validateXsd(xml);
  });

  it("prestador sem endereço (opcional)", () => {
    const dps = makeBaseDps();
    dps.infDps.prestador.endereco = undefined;
    const xml = buildDpsXml(dps);
    expect(xml).not.toContain("<endNac>");
    validateXsd(xml);
  });
});
```

- [ ] **Step 2: Rodar testes**

Run: `npx vitest run src/lib/nfse/__tests__/xml-builder-extended.test.ts`
Expected: PASS (8 testes). Se algum falhar por incompatibilidade com o XSD, ajustar o xml-builder.

- [ ] **Step 3: Commit**

```bash
git add src/lib/nfse/__tests__/xml-builder-extended.test.ts
git commit -m "test(nfse): testes XSD expandidos — tomador PJ, endereço, intermediário, substituição"
```

---

### Task 3: Schemas Zod do form de emissão

**Files:**
- Create: `src/lib/validation/nfse.ts`
- Reference: `src/lib/validation/cliente-mei.ts` (padrão Zod existente)
- Reference: `src/lib/nfse/types.ts` (tipos do DPS)

**Contexto:** Schemas Zod para validar o input do form UI de emissão de NFS-e. Separado do dps-validator que valida o objeto DPS completo. Esses schemas validam cada step do form individualmente.

- [ ] **Step 1: Implementar os schemas**

```typescript
// src/lib/validation/nfse.ts
import { z } from "zod";

const onlyDigits = (v: string) => v.replace(/\D/g, "");

// Step 1: Seleção do cliente MEI
export const stepClienteSchema = z.object({
  clienteMeiId: z.string().uuid("Selecione um cliente MEI"),
});

// Step 2: Serviço
export const stepServicoSchema = z.object({
  codigoTributacaoNacional: z
    .string()
    .trim()
    .min(1, "Código de tributação é obrigatório"),
  descricaoServico: z
    .string()
    .trim()
    .min(5, "Descrição do serviço deve ter pelo menos 5 caracteres")
    .max(2000, "Descrição do serviço excede 2000 caracteres"),
  codigoNbs: z.string().trim().optional().or(z.literal("")),
  localPrestacaoIbge: z
    .string()
    .trim()
    .transform(onlyDigits)
    .refine((v) => v.length === 7, "Código IBGE do município deve ter 7 dígitos"),
});

// Step 3: Tomador
export const stepTomadorSchema = z.object({
  tomadorTipo: z.enum(["cpf", "cnpj"], {
    required_error: "Selecione o tipo de documento",
  }),
  tomadorDocumento: z
    .string()
    .trim()
    .transform(onlyDigits)
    .refine((v) => v.length === 11 || v.length === 14, "CPF (11) ou CNPJ (14) dígitos"),
  tomadorNome: z
    .string()
    .trim()
    .min(2, "Nome do tomador é obrigatório")
    .max(200),
  tomadorEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail inválido")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  // Endereço do tomador (opcional)
  tomadorCep: z.string().trim().transform(onlyDigits).optional().or(z.literal("")),
  tomadorLogradouro: z.string().trim().max(200).optional().or(z.literal("")),
  tomadorNumero: z.string().trim().max(20).optional().or(z.literal("")),
  tomadorComplemento: z.string().trim().max(100).optional().or(z.literal("")),
  tomadorBairro: z.string().trim().max(100).optional().or(z.literal("")),
  tomadorMunicipioIbge: z.string().trim().optional().or(z.literal("")),
});

// Step 4: Valores
export const stepValoresSchema = z.object({
  valorServico: z
    .number({ required_error: "Valor do serviço é obrigatório" })
    .positive("Valor do serviço deve ser maior que zero")
    .max(999999999.99, "Valor excede o máximo permitido"),
  aliquotaIss: z
    .number({ required_error: "Alíquota do ISS é obrigatória" })
    .min(0, "Alíquota não pode ser negativa")
    .max(100, "Alíquota não pode exceder 100%"),
  tributacaoIssqn: z
    .number()
    .int()
    .min(1)
    .max(7)
    .default(1),
});

// Schema completo (merge de todos os steps)
export const criarNfseSchema = stepClienteSchema
  .merge(stepServicoSchema)
  .merge(stepTomadorSchema)
  .merge(stepValoresSchema);

export type StepClienteInput = z.infer<typeof stepClienteSchema>;
export type StepServicoInput = z.infer<typeof stepServicoSchema>;
export type StepTomadorInput = z.infer<typeof stepTomadorSchema>;
export type StepValoresInput = z.infer<typeof stepValoresSchema>;
export type CriarNfseInput = z.infer<typeof criarNfseSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/validation/nfse.ts
git commit -m "feat(nfse): schemas Zod para form de emissão de NFS-e"
```

---

### Task 4: Server Actions de NFS-e (CRUD + emissão)

**Files:**
- Create: `src/lib/actions/nfse.ts`
- Reference: `src/lib/actions/clientes-mei.ts` (padrão de actions)
- Reference: `src/lib/actions/dps-numeracao.ts` (reserva de número)
- Reference: `prisma/schema.prisma:268-317` (model Nfse)
- Reference: `src/lib/nfse/dps-validator.ts` (validação pré-XML)
- Reference: `src/lib/validation/nfse.ts` (schemas Zod do form)

**Contexto:** Actions para criar rascunho de NFS-e (salva no banco com status `rascunho`), listar NFS-e, e buscar detalhes. A emissão real (envio ao gov.br) fica na Fase 3 — aqui só criamos o rascunho validado e enfileiramos para processamento futuro.

- [ ] **Step 1: Implementar as actions**

```typescript
// src/lib/actions/nfse.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { criarNfseSchema, type CriarNfseInput } from "@/lib/validation/nfse";
import { reservarProximoNumeroDps } from "@/lib/actions/dps-numeracao";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface NfseListItem {
  id: string;
  idDps: string;
  serie: string;
  numero: string;
  status: string;
  descricaoServico: string;
  codigoServico: string;
  tomadorNome: string;
  tomadorDocumento: string;
  valorServico: string;
  dataEmissao: Date;
  dataCompetencia: Date;
  clienteMeiRazaoSocial: string;
}

/**
 * Cria um rascunho de NFS-e. Admin+.
 * Reserva número DPS atomicamente, valida input e salva no banco.
 */
export async function criarRascunhoNfse(
  input: CriarNfseInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const currentUser = await requireRole("admin");

    const parsed = criarNfseSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const data = parsed.data;

    // Verificar que o cliente MEI existe e está ativo
    const cliente = await prisma.clienteMei.findUnique({
      where: { id: data.clienteMeiId },
      select: { id: true, isActive: true, cnpj: true },
    });
    if (!cliente || !cliente.isActive) {
      return { success: false, error: "Cliente MEI não encontrado ou inativo" };
    }

    // Reservar número DPS atomicamente
    const numResult = await reservarProximoNumeroDps(data.clienteMeiId);
    if (!numResult.success || !numResult.data) {
      return { success: false, error: numResult.error ?? "Erro ao reservar número DPS" };
    }

    const { serie, numero, idDps } = numResult.data;

    const nfse = await prisma.nfse.create({
      data: {
        clienteMeiId: data.clienteMeiId,
        ambiente: "producao_restrita",
        status: "rascunho",
        idDps,
        serie,
        numero: String(numero),
        dataEmissao: new Date(),
        dataCompetencia: new Date(),
        descricaoServico: data.descricaoServico,
        codigoServico: data.codigoTributacaoNacional,
        codigoNbs: data.codigoNbs || null,
        localPrestacaoIbge: data.localPrestacaoIbge,
        valorServico: data.valorServico,
        aliquotaIss: data.aliquotaIss,
        valorIss: (data.valorServico * data.aliquotaIss) / 100,
        tomadorTipo: data.tomadorTipo,
        tomadorDocumento: data.tomadorDocumento,
        tomadorNome: data.tomadorNome,
        tomadorEmail: data.tomadorEmail || null,
        tomadorEndereco: data.tomadorCep
          ? {
              cep: data.tomadorCep,
              logradouro: data.tomadorLogradouro,
              numero: data.tomadorNumero,
              complemento: data.tomadorComplemento,
              bairro: data.tomadorBairro,
              municipioIbge: data.tomadorMunicipioIbge,
            }
          : undefined,
        createdById: currentUser.id,
      },
      select: { id: true },
    });

    revalidatePath("/nfse");
    return { success: true, data: { id: nfse.id } };
  } catch (error) {
    console.error("[nfse.criarRascunhoNfse]", error);
    return { success: false, error: "Erro ao criar rascunho de NFS-e" };
  }
}

/**
 * Lista NFS-e com filtro opcional por cliente. Admin+.
 */
export async function listarNfses(
  clienteMeiId?: string
): Promise<ActionResult<NfseListItem[]>> {
  try {
    await requireRole("admin");

    const nfses = await prisma.nfse.findMany({
      where: clienteMeiId ? { clienteMeiId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        idDps: true,
        serie: true,
        numero: true,
        status: true,
        descricaoServico: true,
        codigoServico: true,
        tomadorNome: true,
        tomadorDocumento: true,
        valorServico: true,
        dataEmissao: true,
        dataCompetencia: true,
        clienteMei: {
          select: { razaoSocial: true },
        },
      },
    });

    const data: NfseListItem[] = nfses.map((n) => ({
      id: n.id,
      idDps: n.idDps,
      serie: n.serie,
      numero: n.numero,
      status: n.status,
      descricaoServico: n.descricaoServico,
      codigoServico: n.codigoServico,
      tomadorNome: n.tomadorNome,
      tomadorDocumento: n.tomadorDocumento,
      valorServico: n.valorServico.toString(),
      dataEmissao: n.dataEmissao,
      dataCompetencia: n.dataCompetencia,
      clienteMeiRazaoSocial: n.clienteMei.razaoSocial,
    }));

    return { success: true, data };
  } catch (error) {
    console.error("[nfse.listarNfses]", error);
    return { success: false, error: "Erro ao listar NFS-e" };
  }
}

/**
 * Retorna detalhes de uma NFS-e. Admin+.
 */
export async function getNfse(
  id: string
): Promise<ActionResult<NfseListItem>> {
  try {
    await requireRole("admin");

    const n = await prisma.nfse.findUnique({
      where: { id },
      select: {
        id: true,
        idDps: true,
        serie: true,
        numero: true,
        status: true,
        descricaoServico: true,
        codigoServico: true,
        tomadorNome: true,
        tomadorDocumento: true,
        valorServico: true,
        dataEmissao: true,
        dataCompetencia: true,
        clienteMei: {
          select: { razaoSocial: true },
        },
      },
    });

    if (!n) return { success: false, error: "NFS-e não encontrada" };

    return {
      success: true,
      data: {
        id: n.id,
        idDps: n.idDps,
        serie: n.serie,
        numero: n.numero,
        status: n.status,
        descricaoServico: n.descricaoServico,
        codigoServico: n.codigoServico,
        tomadorNome: n.tomadorNome,
        tomadorDocumento: n.tomadorDocumento,
        valorServico: n.valorServico.toString(),
        dataEmissao: n.dataEmissao,
        dataCompetencia: n.dataCompetencia,
        clienteMeiRazaoSocial: n.clienteMei.razaoSocial,
      },
    };
  } catch (error) {
    console.error("[nfse.getNfse]", error);
    return { success: false, error: "Erro ao carregar NFS-e" };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions/nfse.ts
git commit -m "feat(nfse): server actions de NFS-e — criar rascunho, listar, detalhar"
```

---

### Task 5: Páginas e form multi-step de emissão

**Files:**
- Create: `src/app/(protected)/nfse/page.tsx`
- Create: `src/app/(protected)/nfse/nova/page.tsx`
- Create: `src/components/nfse/nova-nfse-form.tsx`
- Create: `src/components/nfse/step-cliente.tsx`
- Create: `src/components/nfse/step-servico.tsx`
- Create: `src/components/nfse/step-tomador.tsx`
- Create: `src/components/nfse/step-valores.tsx`
- Create: `src/components/nfse/step-confirmar.tsx`
- Reference: `src/app/(protected)/clientes/page.tsx` (padrão de página)
- Reference: `src/components/nfse/nbs-selector.tsx` (componente NBS existente)
- Reference: `src/lib/actions/nfse.ts` (actions)
- Reference: `src/lib/actions/clientes-mei.ts` (listClientesMei)
- Reference: `src/lib/actions/parametros-municipais.ts` (fetchParametrosServico)
- Reference: `design-system/nexus-nfe/MASTER.md` (design system)
- REQUIRED SKILL: `ui-ux-pro-max` para todo layout

**Contexto:** Form multi-step para emissão de NFS-e. 5 steps: (1) selecionar cliente MEI, (2) serviço + código NBS via NbsSelector, (3) dados do tomador, (4) valores com cálculo automático de ISS, (5) review final + botão emitir. A emissão real (Fase 3) ficará cinza com tooltip "Disponível em breve" — por agora só cria o rascunho. O form usa estado local (useState) com validação Zod por step.

- [ ] **Step 1: Criar page de listagem `/nfse`**

Página server component que lista NFS-e em tabela com colunas: Número, Cliente, Serviço, Tomador, Valor, Status, Data. Botão "Nova NFS-e" que navega para `/nfse/nova`. Segue o mesmo padrão visual de `/clientes` (tabela com shadcn).

- [ ] **Step 2: Criar page wrapper `/nfse/nova`**

Page server component simples que renderiza o `<NovaNfseForm />` client component.

- [ ] **Step 3: Criar `nova-nfse-form.tsx` com state machine de steps**

Controller do form multi-step. Gerencia currentStep (1-5), dados acumulados de cada step, navegação prev/next com validação por step, e submit final que chama `criarRascunhoNfse`.

- [ ] **Step 4: Criar `step-cliente.tsx`**

Lista clientes MEI ativos com busca inline. Cada card mostra razão social, CNPJ, status do certificado. Selecionar um define o clienteMeiId.

- [ ] **Step 5: Criar `step-servico.tsx`**

Usa `NbsSelector` para selecionar código de tributação. Campo de descrição do serviço (textarea). Campo de município de prestação (padrão: município do cliente selecionado).

- [ ] **Step 6: Criar `step-tomador.tsx`**

Toggle CPF/CNPJ. Campos: documento, nome, e-mail (opcional). Seção expansível "Endereço do tomador" (opcional): CEP, logradouro, número, complemento, bairro, município.

- [ ] **Step 7: Criar `step-valores.tsx`**

Campos: valor do serviço (R$), alíquota ISS (%). Cálculo automático: valor ISS = valor × alíquota / 100. Usa `fetchParametrosServico` para sugerir alíquota do município. Preview: valor bruto, ISS, valor líquido.

- [ ] **Step 8: Criar `step-confirmar.tsx`**

Resume todas as informações dos steps anteriores em formato read-only. Botão "Criar rascunho" que chama a action. Botão "Emitir NFS-e" desabilitado com tooltip "Disponível na Fase 3 — aguardando mTLS".

- [ ] **Step 9: Commit**

```bash
git add src/app/\(protected\)/nfse/ src/components/nfse/
git commit -m "feat(nfse): form multi-step de emissão de NFS-e com 5 etapas"
```

---

### Task 6: Atualizar sidebar, CLAUDE.md e rodar testes

**Files:**
- Modify: `src/components/layout/sidebar.tsx` — adicionar link "/nfse" com ícone FileText
- Modify: `CLAUDE.md` — atualizar estado para Fase 2 concluída

- [ ] **Step 1: Adicionar `/nfse` na sidebar**

Adicionar item na sidebar entre "Clientes" e "Configurações":
```tsx
{ href: "/nfse", label: "Notas Fiscais", icon: FileText }
```

- [ ] **Step 2: Atualizar CLAUDE.md**

Adicionar na seção concluído:
```markdown
- ✅ **Fase 2** — DPS Builder completo + Form de emissão
  - Validador Zod do DPS com regras de negócio
  - Testes XSD expandidos (tomador PJ, endereço, intermediário, substituição)
  - Form multi-step de emissão (5 etapas)
  - Server actions: criarRascunho, listarNfses, getNfse
  - Página de listagem /nfse + /nfse/nova
```

- [ ] **Step 3: Rodar todos os testes**

Run: `npx vitest run`
Expected: Todos os testes passando

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/sidebar.tsx CLAUDE.md
git commit -m "feat(nfse): sidebar + docs — Fase 2 concluída"
```
