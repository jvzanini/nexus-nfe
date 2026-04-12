# Fase 1B: Catálogo NBS + Parâmetros Municipais + Numeração DPS

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importar o catálogo de códigos de tributação nacional (LC 116/2003), criar busca com autocomplete, implementar wrapper cacheado de parâmetros municipais (mock até Fase 3), e numeração atômica de DPS.

**Architecture:** Seed script lê a planilha XLSX oficial e popula `CodigoTributacaoNacional` (model Prisma já existe). Server action de busca usa `ILIKE` com debounce no client. Parâmetros municipais ficam em wrapper com interface real mas dados mockados (mTLS só na Fase 3). Numeração DPS usa transação Prisma com `$executeRaw` SELECT FOR UPDATE.

**Tech Stack:** TypeScript, Prisma 6, PostgreSQL 16, Redis 7 (cache), xlsx (npm), Vitest, Next.js Server Actions, shadcn/ui

---

## File Structure

```
scripts/
  seed-nbs.ts                          # CREATE — parser XLSX + seed Prisma

src/lib/
  actions/
    nbs.ts                             # CREATE — searchNbs server action
    parametros-municipais.ts           # CREATE — getParametrosMunicipais action
    dps-numeracao.ts                   # CREATE — reservarProximoNumeroDps action
  nfse/
    parametros-municipais.ts           # CREATE — wrapper + tipos + mock
    __tests__/
      nbs-seed.test.ts                 # CREATE — testes do seed parser
      dps-numeracao.test.ts            # CREATE — testes de numeração atômica
      parametros-municipais.test.ts    # CREATE — testes do wrapper

src/components/nfse/
  nbs-selector.tsx                     # CREATE — autocomplete de código NBS
```

---

### Task 1: Seed do catálogo de códigos de tributação nacional

**Files:**
- Create: `scripts/seed-nbs.ts`
- Create: `src/lib/nfse/__tests__/nbs-seed.test.ts`
- Reference: `docs/nfse/reference/anexo-b-nbs.xlsx`
- Reference: `prisma/schema.prisma:376-386` (model `CodigoTributacaoNacional`)

**Contexto:** A planilha `anexo-b-nbs.xlsx` contém a aba `LISTA.SERV.NAC` com ~580 linhas da LC 116/2003. Estrutura: `item(2) + subitem(2) + desdobroNacional(2) = 6 dígitos`. Linhas com desdobro=0 são headers hierárquicos (nível 1); desdobro>0 são emitíveis (nível 2). O script `scripts/inspect-nbs.ts` já existe como referência de como ler a planilha com `xlsx`.

- [ ] **Step 1: Escrever o teste do parser**

```typescript
// src/lib/nfse/__tests__/nbs-seed.test.ts
import { describe, it, expect } from "vitest";
import { parseNbsSheet } from "../../nfse/nbs-parser";

describe("parseNbsSheet", () => {
  it("deve retornar array com pelo menos 100 códigos emitíveis", () => {
    const result = parseNbsSheet();
    expect(result.length).toBeGreaterThan(100);
  });

  it("cada código deve ter 6 dígitos numéricos", () => {
    const result = parseNbsSheet();
    for (const item of result) {
      expect(item.codigo).toMatch(/^\d{6}$/);
    }
  });

  it("cada código deve ter descrição não vazia", () => {
    const result = parseNbsSheet();
    for (const item of result) {
      expect(item.descricao.length).toBeGreaterThan(0);
    }
  });

  it("nível deve ser 1 ou 2", () => {
    const result = parseNbsSheet();
    for (const item of result) {
      expect([1, 2]).toContain(item.nivel);
    }
  });

  it("headers (nível 1) não devem ter parentCodigo", () => {
    const result = parseNbsSheet();
    const headers = result.filter((r) => r.nivel === 1);
    expect(headers.length).toBeGreaterThan(0);
    for (const h of headers) {
      expect(h.parentCodigo).toBeNull();
    }
  });

  it("subitens (nível 2) devem ter parentCodigo válido", () => {
    const result = parseNbsSheet();
    const subs = result.filter((r) => r.nivel === 2);
    expect(subs.length).toBeGreaterThan(0);
    const allCodes = new Set(result.map((r) => r.codigo));
    for (const s of subs) {
      expect(s.parentCodigo).not.toBeNull();
      expect(allCodes.has(s.parentCodigo!)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Rodar o teste para verificar que falha**

Run: `npx vitest run src/lib/nfse/__tests__/nbs-seed.test.ts`
Expected: FAIL — `parseNbsSheet` não existe

- [ ] **Step 3: Implementar o parser**

Criar `src/lib/nfse/nbs-parser.ts`:

```typescript
// Parser da planilha oficial de códigos de tributação nacional (LC 116/2003).
// Lê docs/nfse/reference/anexo-b-nbs.xlsx, aba LISTA.SERV.NAC.

import XLSX from "xlsx";
import path from "node:path";

export interface NbsRecord {
  codigo: string;       // 6 dígitos: item(2) + subitem(2) + desdobro(2)
  descricao: string;
  nivel: number;        // 1 = item (header), 2 = subitem (emitível)
  parentCodigo: string | null;
  aliquotaMin: number | null;
  aliquotaMax: number | null;
}

export function parseNbsSheet(): NbsRecord[] {
  const filePath = path.resolve(
    process.cwd(),
    "docs/nfse/reference/anexo-b-nbs.xlsx"
  );
  const wb = XLSX.readFile(filePath);

  // Aba com os códigos da LC 116/2003
  const sheetName = wb.SheetNames.find((n) =>
    n.toUpperCase().includes("LISTA.SERV.NAC")
  );
  if (!sheetName) {
    throw new Error(
      `Aba LISTA.SERV.NAC não encontrada. Abas disponíveis: ${wb.SheetNames.join(", ")}`
    );
  }

  const ws = wb.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Pula o header da planilha (primeira linha)
  const dataRows = rows.slice(1).filter((r) => r.length > 0);

  const records: NbsRecord[] = [];

  for (const row of dataRows) {
    const item = String(row[0] ?? "").trim().padStart(2, "0");
    const subitem = String(row[1] ?? "").trim().padStart(2, "0");
    const desdobro = String(row[2] ?? "").trim().padStart(2, "0");
    const descricao = String(row[3] ?? "").trim();

    if (!descricao || !/^\d{2}$/.test(item)) continue;

    const codigo = `${item}${subitem}${desdobro}`;
    const isHeader = subitem === "00" && desdobro === "00";
    const isSubitem = desdobro === "00" && subitem !== "00";

    let nivel: number;
    let parentCodigo: string | null;

    if (isHeader) {
      nivel = 1;
      parentCodigo = null;
    } else {
      nivel = 2;
      // Parent é o item de nível acima
      if (isSubitem) {
        parentCodigo = `${item}0000`;
      } else {
        parentCodigo = `${item}${subitem}00`;
      }
    }

    // Alíquotas podem vir nas colunas 4 e 5 (opcional)
    const aliqMin = row[4] != null ? Number(row[4]) : null;
    const aliqMax = row[5] != null ? Number(row[5]) : null;

    records.push({
      codigo,
      descricao,
      nivel,
      parentCodigo,
      aliquotaMin: aliqMin && !isNaN(aliqMin) ? aliqMin : null,
      aliquotaMax: aliqMax && !isNaN(aliqMax) ? aliqMax : null,
    });
  }

  return records;
}
```

- [ ] **Step 4: Rodar o teste para verificar que passa**

Run: `npx vitest run src/lib/nfse/__tests__/nbs-seed.test.ts`
Expected: PASS (6 testes)

Se o layout da planilha não bater exatamente (colunas diferente do esperado), ajustar o parser baseado na saída de `npx tsx scripts/inspect-nbs.ts`.

- [ ] **Step 5: Implementar o script de seed**

```typescript
// scripts/seed-nbs.ts
// Rodar: npx tsx scripts/seed-nbs.ts

import { PrismaClient } from "../src/generated/prisma/client";
import { parseNbsSheet } from "../src/lib/nfse/nbs-parser";

async function main() {
  const prisma = new PrismaClient();

  try {
    const records = parseNbsSheet();
    console.log(`Parsed ${records.length} códigos da planilha`);

    let inserted = 0;
    let updated = 0;

    // Batch upsert em chunks de 50 para não sobrecarregar
    for (let i = 0; i < records.length; i += 50) {
      const chunk = records.slice(i, i + 50);

      await prisma.$transaction(
        chunk.map((r) =>
          prisma.codigoTributacaoNacional.upsert({
            where: { codigo: r.codigo },
            create: {
              codigo: r.codigo,
              descricao: r.descricao,
              nivel: r.nivel,
              parentCodigo: r.parentCodigo,
              aliquotaMin: r.aliquotaMin,
              aliquotaMax: r.aliquotaMax,
            },
            update: {
              descricao: r.descricao,
              nivel: r.nivel,
              parentCodigo: r.parentCodigo,
              aliquotaMin: r.aliquotaMin,
              aliquotaMax: r.aliquotaMax,
            },
          })
        )
      );

      inserted += chunk.length;
      process.stdout.write(`\r  ${inserted}/${records.length} processados`);
    }

    console.log(`\n✔ Seed completo: ${records.length} códigos de tributação nacional`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
```

- [ ] **Step 6: Rodar o seed**

Run: `npx tsx scripts/seed-nbs.ts`
Expected: "Seed completo: ~580 códigos de tributação nacional"

Se o DB não estiver rodando localmente (Docker), rodar o seed requer `DATABASE_URL` correto. Confirmar que `.env` ou `.env.local` tem a URL do PostgreSQL.

- [ ] **Step 7: Commit**

```bash
git add src/lib/nfse/nbs-parser.ts src/lib/nfse/__tests__/nbs-seed.test.ts scripts/seed-nbs.ts
git commit -m "feat(nfse): parser e seed do catálogo de códigos de tributação nacional (LC 116/2003)"
```

---

### Task 2: Server Action de busca NBS

**Files:**
- Create: `src/lib/actions/nbs.ts`
- Reference: `src/lib/actions/clientes-mei.ts` (padrão de actions)
- Reference: `src/lib/auth.ts:63-79` (`requireRole`)
- Reference: `prisma/schema.prisma:376-386` (model + index `idx_nbs_descricao`)

**Contexto:** Server action que busca códigos por descrição (ILIKE) retornando top 20 resultados. Segue o padrão `ActionResult<T>` usado nas demais actions. Rota `requireRole("admin")`.

- [ ] **Step 1: Implementar a action de busca**

```typescript
// src/lib/actions/nbs.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export interface NbsSearchResult {
  codigo: string;
  descricao: string;
  nivel: number;
  aliquotaMin: string | null; // Decimal serializado como string
  aliquotaMax: string | null;
}

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Busca códigos de tributação nacional por descrição ou código.
 * Retorna top 20 resultados ordenados por relevância (código exato primeiro, depois ILIKE).
 */
export async function searchNbs(
  query: string
): Promise<ActionResult<NbsSearchResult[]>> {
  try {
    await requireRole("admin");

    const q = query.trim();
    if (q.length < 2) {
      return { success: true, data: [] };
    }

    // Se for só dígitos, busca por código; senão, por descrição
    const isCodeSearch = /^\d+$/.test(q);

    const results = await prisma.codigoTributacaoNacional.findMany({
      where: isCodeSearch
        ? { codigo: { startsWith: q } }
        : { descricao: { contains: q, mode: "insensitive" } },
      orderBy: { codigo: "asc" },
      take: 20,
      select: {
        codigo: true,
        descricao: true,
        nivel: true,
        aliquotaMin: true,
        aliquotaMax: true,
      },
    });

    const data: NbsSearchResult[] = results.map((r) => ({
      codigo: r.codigo,
      descricao: r.descricao,
      nivel: r.nivel,
      aliquotaMin: r.aliquotaMin?.toString() ?? null,
      aliquotaMax: r.aliquotaMax?.toString() ?? null,
    }));

    return { success: true, data };
  } catch (error) {
    console.error("[nbs.searchNbs]", error);
    return { success: false, error: "Erro ao buscar códigos de tributação" };
  }
}

/**
 * Retorna um código específico pelo código exato. Usado para preencher detalhes.
 */
export async function getNbsByCodigo(
  codigo: string
): Promise<ActionResult<NbsSearchResult>> {
  try {
    await requireRole("admin");

    const result = await prisma.codigoTributacaoNacional.findUnique({
      where: { codigo },
      select: {
        codigo: true,
        descricao: true,
        nivel: true,
        aliquotaMin: true,
        aliquotaMax: true,
      },
    });

    if (!result) {
      return { success: false, error: "Código não encontrado" };
    }

    return {
      success: true,
      data: {
        ...result,
        aliquotaMin: result.aliquotaMin?.toString() ?? null,
        aliquotaMax: result.aliquotaMax?.toString() ?? null,
      },
    };
  } catch (error) {
    console.error("[nbs.getNbsByCodigo]", error);
    return { success: false, error: "Erro ao buscar código" };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions/nbs.ts
git commit -m "feat(nfse): server action de busca de códigos de tributação nacional"
```

---

### Task 3: Componente NBS Selector com autocomplete

**Files:**
- Create: `src/components/nfse/nbs-selector.tsx`
- Reference: `src/components/ui/input.tsx` (shadcn input)
- Reference: `src/components/ui/badge.tsx` (shadcn badge)
- Reference: `src/lib/actions/nbs.ts` (action de busca)
- Reference: `design-system/nexus-nfe/MASTER.md` (design system)

**Contexto:** Componente de autocomplete para seleção de código de tributação. Debounce de 300ms, mostra código + descrição + range de alíquota. Será usado no form de emissão de NFS-e (Fase 2). Segue design system Nexus (dark mode, cores, tipografia).

- [ ] **Step 1: Criar o componente**

```tsx
// src/components/nfse/nbs-selector.tsx
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { searchNbs, type NbsSearchResult } from "@/lib/actions/nbs";
import { Search, Loader2 } from "lucide-react";

interface NbsSelectorProps {
  value?: string;
  onSelect: (codigo: string, descricao: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function NbsSelector({
  value,
  onSelect,
  placeholder = "Buscar por código ou descrição do serviço...",
  disabled = false,
}: NbsSelectorProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NbsSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      const res = await searchNbs(q);
      if (res.success && res.data) {
        setResults(res.data);
        setIsOpen(res.data.length > 0);
      }
      setIsLoading(false);
    }, 300);
  }, []);

  function handleSelect(item: NbsSearchResult) {
    onSelect(item.codigo, item.descricao);
    setSelectedLabel(`${item.codigo} — ${item.descricao}`);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  }

  function formatAliquota(item: NbsSearchResult): string | null {
    if (!item.aliquotaMin && !item.aliquotaMax) return null;
    if (item.aliquotaMin === item.aliquotaMax) return `${item.aliquotaMin}%`;
    return `${item.aliquotaMin ?? "?"}% – ${item.aliquotaMax ?? "?"}%`;
  }

  return (
    <div ref={containerRef} className="relative">
      {value && selectedLabel && !query ? (
        <div
          className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm cursor-pointer hover:bg-muted"
          onClick={() => {
            if (!disabled) {
              setSelectedLabel("");
              setQuery("");
            }
          }}
        >
          <Badge variant="secondary" className="font-mono text-xs">
            {value}
          </Badge>
          <span className="truncate text-muted-foreground">
            {selectedLabel.split(" — ")[1]}
          </span>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => results.length > 0 && setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="pl-9"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      )}

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
          {results.map((item) => {
            const aliq = formatAliquota(item);
            return (
              <button
                key={item.codigo}
                type="button"
                className="flex w-full items-start gap-3 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                onClick={() => handleSelect(item)}
              >
                <Badge
                  variant="outline"
                  className="mt-0.5 shrink-0 font-mono text-xs"
                >
                  {item.codigo}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate">{item.descricao}</p>
                  {aliq && (
                    <p className="text-xs text-muted-foreground">ISS: {aliq}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/nfse/nbs-selector.tsx
git commit -m "feat(nfse): componente NBS Selector com autocomplete e debounce"
```

---

### Task 4: Wrapper de parâmetros municipais (mock)

**Files:**
- Create: `src/lib/nfse/parametros-municipais.ts`
- Create: `src/lib/actions/parametros-municipais.ts`
- Create: `src/lib/nfse/__tests__/parametros-municipais.test.ts`
- Reference: `src/lib/nfse/constants.ts` (endpoints e rotas)
- Reference: `src/lib/redis.ts` (client Redis)

**Contexto:** A API de parâmetros municipais (`GET /parametros_municipais/{cMun}/convenio` e `GET /parametros_municipais/{cMun}/{cServ}`) exige mTLS que só será implementado na Fase 3. A interface completa é criada agora com dados mockados. Cache Redis com TTL 24h. Na Fase 3, troca o mock pelo client HTTP real.

- [ ] **Step 1: Escrever os testes**

```typescript
// src/lib/nfse/__tests__/parametros-municipais.test.ts
import { describe, it, expect } from "vitest";
import {
  getConvenioMunicipal,
  getParametrosServico,
  type ConvenioMunicipal,
  type ParametrosServico,
} from "../parametros-municipais";

describe("parametros-municipais (mock)", () => {
  it("getConvenioMunicipal retorna dados para Brasília (5300108)", async () => {
    const result = await getConvenioMunicipal("5300108");
    expect(result).not.toBeNull();
    expect(result!.codigoMunicipio).toBe("5300108");
    expect(result!.aderiu).toBe(true);
  });

  it("getConvenioMunicipal retorna null para município inexistente", async () => {
    const result = await getConvenioMunicipal("0000000");
    expect(result).toBeNull();
  });

  it("getParametrosServico retorna alíquota para serviço válido em Brasília", async () => {
    const result = await getParametrosServico("5300108", "010101");
    expect(result).not.toBeNull();
    expect(typeof result!.aliquota).toBe("number");
    expect(result!.aliquota).toBeGreaterThan(0);
  });

  it("getParametrosServico retorna null para serviço inexistente", async () => {
    const result = await getParametrosServico("5300108", "999999");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar os testes para verificar que falham**

Run: `npx vitest run src/lib/nfse/__tests__/parametros-municipais.test.ts`
Expected: FAIL — módulo não existe

- [ ] **Step 3: Implementar o wrapper com mock**

```typescript
// src/lib/nfse/parametros-municipais.ts
// Wrapper para parâmetros municipais do gov.br/nfse.
// Fase 1B: dados mockados. Fase 3: integração real via mTLS.
//
// Endpoints reais (pra referência futura):
//   GET {sefinBase}/parametros_municipais/{cMun}/convenio
//   GET {sefinBase}/parametros_municipais/{cMun}/{cServ}

export interface ConvenioMunicipal {
  codigoMunicipio: string;
  nomeMunicipio: string;
  uf: string;
  aderiu: boolean;
  dataAdesao: string | null;
  regimeEspecial: boolean;
}

export interface ParametrosServico {
  codigoMunicipio: string;
  codigoServico: string;
  aliquota: number;
  beneficioFiscal: boolean;
  descricaoBeneficio: string | null;
}

// ─── Mock Data (removido na Fase 3) ─────────────────────────────────

const MOCK_CONVENIOS: Record<string, ConvenioMunicipal> = {
  "5300108": {
    codigoMunicipio: "5300108",
    nomeMunicipio: "Brasília",
    uf: "DF",
    aderiu: true,
    dataAdesao: "2023-09-01",
    regimeEspecial: false,
  },
};

const MOCK_ALIQUOTA_PADRAO = 5.0; // ISS padrão DF
const MOCK_ALIQUOTA_TI = 2.0; // Serviços de TI no DF

function getMockAliquota(cServ: string): number | null {
  // Códigos começando com 01 (TI/informática) têm alíquota reduzida no DF
  if (cServ.startsWith("01")) return MOCK_ALIQUOTA_TI;
  // Demais serviços: alíquota padrão
  if (/^\d{6}$/.test(cServ)) return MOCK_ALIQUOTA_PADRAO;
  return null;
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Consulta se o município aderiu ao convênio NFS-e nacional.
 * Fase 1B: mock. Fase 3: GET real com cache Redis TTL 24h.
 */
export async function getConvenioMunicipal(
  codigoMunicipio: string
): Promise<ConvenioMunicipal | null> {
  // TODO Fase 3: substituir por fetch mTLS + cache Redis
  return MOCK_CONVENIOS[codigoMunicipio] ?? null;
}

/**
 * Consulta parâmetros de serviço (alíquota, benefícios) para um município.
 * Fase 1B: mock. Fase 3: GET real com cache Redis TTL 24h.
 */
export async function getParametrosServico(
  codigoMunicipio: string,
  codigoServico: string
): Promise<ParametrosServico | null> {
  // TODO Fase 3: substituir por fetch mTLS + cache Redis
  const convenio = MOCK_CONVENIOS[codigoMunicipio];
  if (!convenio) return null;

  const aliquota = getMockAliquota(codigoServico);
  if (aliquota === null) return null;

  return {
    codigoMunicipio,
    codigoServico,
    aliquota,
    beneficioFiscal: false,
    descricaoBeneficio: null,
  };
}
```

- [ ] **Step 4: Rodar os testes para verificar que passam**

Run: `npx vitest run src/lib/nfse/__tests__/parametros-municipais.test.ts`
Expected: PASS (4 testes)

- [ ] **Step 5: Implementar a server action**

```typescript
// src/lib/actions/parametros-municipais.ts
"use server";

import { requireRole } from "@/lib/auth";
import {
  getConvenioMunicipal,
  getParametrosServico,
  type ConvenioMunicipal,
  type ParametrosServico,
} from "@/lib/nfse/parametros-municipais";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Consulta convênio municipal. Admin+.
 */
export async function fetchConvenioMunicipal(
  codigoMunicipio: string
): Promise<ActionResult<ConvenioMunicipal>> {
  try {
    await requireRole("admin");

    if (!/^\d{7}$/.test(codigoMunicipio)) {
      return { success: false, error: "Código IBGE deve ter 7 dígitos" };
    }

    const data = await getConvenioMunicipal(codigoMunicipio);
    if (!data) {
      return {
        success: false,
        error: "Município não encontrado ou não aderiu ao convênio",
      };
    }

    return { success: true, data };
  } catch (error) {
    console.error("[parametros-municipais.fetchConvenioMunicipal]", error);
    return { success: false, error: "Erro ao consultar convênio municipal" };
  }
}

/**
 * Consulta parâmetros de serviço (alíquota ISS) para um município. Admin+.
 */
export async function fetchParametrosServico(
  codigoMunicipio: string,
  codigoServico: string
): Promise<ActionResult<ParametrosServico>> {
  try {
    await requireRole("admin");

    if (!/^\d{7}$/.test(codigoMunicipio)) {
      return { success: false, error: "Código IBGE deve ter 7 dígitos" };
    }
    if (!/^\d{6}$/.test(codigoServico)) {
      return {
        success: false,
        error: "Código de serviço deve ter 6 dígitos",
      };
    }

    const data = await getParametrosServico(codigoMunicipio, codigoServico);
    if (!data) {
      return {
        success: false,
        error: "Parâmetros não encontrados para este serviço/município",
      };
    }

    return { success: true, data };
  } catch (error) {
    console.error("[parametros-municipais.fetchParametrosServico]", error);
    return { success: false, error: "Erro ao consultar parâmetros do serviço" };
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/nfse/parametros-municipais.ts src/lib/nfse/__tests__/parametros-municipais.test.ts src/lib/actions/parametros-municipais.ts
git commit -m "feat(nfse): wrapper de parâmetros municipais com mock (mTLS real na Fase 3)"
```

---

### Task 5: Numeração atômica de DPS

**Files:**
- Create: `src/lib/actions/dps-numeracao.ts`
- Create: `src/lib/nfse/__tests__/dps-numeracao.test.ts`
- Reference: `prisma/schema.prisma:233-234` (campos `serieDpsAtual`, `ultimoNumeroDps`)
- Reference: `src/lib/nfse/dps-id.ts` (`buildIdDps`)

**Contexto:** Cada emissão de NFS-e precisa de um número sequencial único por cliente MEI. A action roda em transação Prisma com SELECT FOR UPDATE para evitar race conditions. Retorna série + número + idDps completo (45 chars).

- [ ] **Step 1: Escrever o teste**

```typescript
// src/lib/nfse/__tests__/dps-numeracao.test.ts
import { describe, it, expect } from "vitest";
import { buildIdDps } from "../dps-id";

describe("numeração DPS — buildIdDps com série e número sequencial", () => {
  it("gera idDps válido com número 1 e série 00001", () => {
    const id = buildIdDps({
      codigoLocalEmissao: "5300108",
      tipoInscricao: 1,
      inscricaoFederal: "12345678000195",
      serie: "00001",
      numero: "1",
    });
    expect(id).toHaveLength(45);
    expect(id).toMatch(/^DPS/);
    // Número 1 deve virar "000000000000001"
    expect(id.slice(-15)).toBe("000000000000001");
    // Série 00001
    expect(id.slice(-20, -15)).toBe("00001");
  });

  it("gera idDps válido com número alto (999)", () => {
    const id = buildIdDps({
      codigoLocalEmissao: "5300108",
      tipoInscricao: 1,
      inscricaoFederal: "12345678000195",
      serie: "00001",
      numero: "999",
    });
    expect(id).toHaveLength(45);
    expect(id.slice(-15)).toBe("000000000000999");
  });

  it("números diferentes geram idDps diferentes", () => {
    const base = {
      codigoLocalEmissao: "5300108",
      tipoInscricao: 1 as const,
      inscricaoFederal: "12345678000195",
      serie: "00001",
    };
    const id1 = buildIdDps({ ...base, numero: "1" });
    const id2 = buildIdDps({ ...base, numero: "2" });
    expect(id1).not.toBe(id2);
  });
});
```

- [ ] **Step 2: Rodar o teste para verificar que passa**

Run: `npx vitest run src/lib/nfse/__tests__/dps-numeracao.test.ts`
Expected: PASS (3 testes — `buildIdDps` já existe e funciona)

- [ ] **Step 3: Implementar a action de numeração**

```typescript
// src/lib/actions/dps-numeracao.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { buildIdDps } from "@/lib/nfse/dps-id";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface NumeracaoDps {
  serie: string;
  numero: number;
  idDps: string;
}

/**
 * Reserva o próximo número de DPS para um cliente MEI.
 * Usa transação com SELECT FOR UPDATE para evitar race conditions.
 * Retorna série, número e idDps completo (45 chars).
 */
export async function reservarProximoNumeroDps(
  clienteMeiId: string
): Promise<ActionResult<NumeracaoDps>> {
  try {
    await requireRole("admin");

    const result = await prisma.$transaction(async (tx) => {
      // SELECT FOR UPDATE: trava a row até o fim da transação
      const rows = await tx.$queryRaw<
        Array<{
          cnpj: string;
          serie_dps_atual: string;
          ultimo_numero_dps: number;
          municipio_ibge: string;
        }>
      >`
        SELECT cnpj, serie_dps_atual, ultimo_numero_dps, municipio_ibge
        FROM clientes_mei
        WHERE id = ${clienteMeiId}::uuid AND is_active = true
        FOR UPDATE
      `;

      if (rows.length === 0) {
        throw new Error("Cliente MEI não encontrado ou inativo");
      }

      const cliente = rows[0];
      const novoNumero = cliente.ultimo_numero_dps + 1;

      await tx.clienteMei.update({
        where: { id: clienteMeiId },
        data: { ultimoNumeroDps: novoNumero },
      });

      const idDps = buildIdDps({
        codigoLocalEmissao: cliente.municipio_ibge,
        tipoInscricao: 1, // MEI é sempre CNPJ
        inscricaoFederal: cliente.cnpj,
        serie: cliente.serie_dps_atual,
        numero: String(novoNumero),
      });

      return {
        serie: cliente.serie_dps_atual,
        numero: novoNumero,
        idDps,
      };
    });

    return { success: true, data: result };
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Erro ao reservar número DPS";
    console.error("[dps-numeracao.reservarProximoNumeroDps]", error);
    return { success: false, error: msg };
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/dps-numeracao.ts src/lib/nfse/__tests__/dps-numeracao.test.ts
git commit -m "feat(nfse): numeração atômica de DPS com SELECT FOR UPDATE"
```

---

### Task 6: Atualizar CLAUDE.md com estado da Fase 1B

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Atualizar a seção "Estado atual" do CLAUDE.md**

Adicionar na seção de concluído:
```markdown
- ✅ **Fase 1A** — Cadastro MEI + Upload de certificado (BrasilAPI, criptografia AES-256-GCM, cron expiração)
- ✅ **Fase 1B** — Catálogo NBS + Parâmetros Municipais + Numeração DPS
  - Seed de ~580 códigos de tributação nacional (LC 116/2003)
  - Busca por código/descrição com autocomplete
  - Wrapper de parâmetros municipais (mock, mTLS real na Fase 3)
  - Numeração atômica de DPS (SELECT FOR UPDATE)
```

Atualizar "Em andamento" para:
```markdown
### Próximo: Fase 2 — DPS Builder completo
```

Adicionar na seção "Estrutura de Actions":
```markdown
- `nbs.ts` — Busca de códigos de tributação nacional
- `parametros-municipais.ts` — Convênio e parâmetros de serviço por município
- `dps-numeracao.ts` — Reserva de número sequencial de DPS
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: atualiza estado do projeto — Fase 1B concluída"
```
