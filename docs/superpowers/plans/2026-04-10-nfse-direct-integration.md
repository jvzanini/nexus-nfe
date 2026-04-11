# Integração direta com gov.br/nfse — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Motor de emissão de NFS-e pra MEI integrando diretamente com a API pública do Emissor Nacional `gov.br/nfse`, sem gateway pago, com UX de "1-clique" pra reemitir serviços recorrentes.

**Architecture:** A Nexus NFE é cliente REST direto do SEFIN Nacional. Cada MEI carrega seu próprio certificado A1 (cifrado AES-256-GCM em repouso). No momento da emissão, o certificado decriptado em memória assina o XML do DPS via XMLDSIG e estabelece mTLS com o endpoint oficial. Emissão é **síncrona** (não precisa polling); BullMQ apenas desacopla a UI do processamento. Reconciliação de estado em caso de crash usa `HEAD /dps/{id}`. DANFS-e PDF é obtido via endpoint do ADN ou renderizado localmente a partir do XML autorizado (decisão no spike).

**Tech Stack:**
- Next.js 15 + TypeScript (projeto Nexus NFE existente)
- PostgreSQL + Prisma, Redis + BullMQ, encryption AES-256-GCM, outbox pattern, audit-log (todos existentes)
- `node-forge` — parser de `.pfx`, extrai chave + certificado X.509
- `xml-crypto` v6+ — assinatura XMLDSIG c14n-20010315 RSA-SHA256
- `xmlbuilder2` — serialização XML com namespace
- `zlib` (nativo) — GZip
- `https.Agent` (nativo) — transporte mTLS
- `vitest` — testes unitários (a ser configurado)
- `libxml2` / `xmllint` (CLI) — validação de XSD offline durante dev
- `xmlsec1` (CLI) — validação de assinatura offline durante dev

---

## Contexto confirmado pela pesquisa

**Documentação oficial consultada (salva em `docs/nfse/reference/`):**
- Manual Contribuintes v1.2 (out/2025)
- Schemas XSD v1.01 (fev/2026)
- `dps-schema-notes.md` com a estrutura extraída do XSD

**Endpoints confirmados no manual:**
- POST `/nfse` — **emissão SÍNCRONA** (body JSON `{"dpsXmlGZipB64": "..."}`)
- GET `/nfse/{chaveAcesso}` — consulta
- HEAD `/dps/{id}` — reconciliação
- POST `/nfse/{chaveAcesso}/eventos` — cancelamento, substituição
- GET `/parametros_municipais/*` — alíquotas, regimes, benefícios

**Ambientes:**
- Homologação SEFIN: `https://sefin.producaorestrita.nfse.gov.br/SefinNacional`
- Produção SEFIN: `https://sefin.nfse.gov.br/SefinNacional`
- Swagger: `https://adn.producaorestrita.nfse.gov.br/contribuintes/docs/index.html`

**Bibliotecas de referência (PHP/C#) identificadas — não há Node/TS maduro:**
- `Rainzart/nfse-nacional` (PHP ativo, jan/2026) — referência pro shape request
- `nfe/poc-nfse-nacional` (C#) — referência pro fluxo

**Fatos críticos:**
- Emissão é síncrona → worker só desacopla UI, não faz polling pra caso normal
- Certificado ICP-Brasil A1/A3 autentica (mTLS) E assina (XMLDSIG) com o mesmo cert
- Substituição de nota é nativa no DPS (`subst.chSubstda`)
- Reconciliação pós-crash via `HEAD /dps/{id}`
- MEI usa `opSimpNac=2` + `regEspTrib=0` no `regTrib`
- DF tem **um único município**: `cLocEmi = 5300108` (Brasília)
- Limite MEI 2026: R$ 81.000/ano. Desenquadramento retroativo se exceder 20%
- DANFS-e PDF: spike vai confirmar se a API retorna ou se a gente renderiza

---

## Diferenças em relação ao plano v1 (que foi descartado)

O plano anterior tinha buracos grandes que foram identificados em review crítico:
1. ❌ `xml-builder.ts` inventado sem ler o XSD — **resolvido**: schema XSD lido, estrutura mapeada em `dps-schema-notes.md`
2. ❌ DANFS-e jogado pra fase 4 sem pesquisa — **parcialmente resolvido**: spike vai confirmar API do ADN
3. ❌ Código NBS sem plano de UX — **resolvido**: nova fase dedicada à importação + selector
4. ❌ Regras MEI (limite R$81k) ausentes — **resolvido**: nova fase dedicada
5. ❌ Fase de UX 1-clique era 4 linhas — **resolvido**: fase inteira dedicada ao form inteligente
6. ❌ Worker sem reconciliação — **resolvido**: pattern `HEAD /dps/{id}` integrado
7. ❌ Numeração DPS não definida — **resolvido**: decisão explícita (contínua por prestador + série)
8. ❌ Falta infra de testes (vitest) — **resolvido**: Task 0.X dedicada
9. ❌ Estimativas otimistas — **corrigido**: 3-4 meses é realista
10. ❌ Zero pesquisa de libs open-source — **resolvido**: Rainzart PHP mapeada como referência

---

## Decomposição em fases

| Fase | Objetivo | Duração | Critério de saída |
|---|---|---|---|
| **-1** | Spike técnico: XML builder real + assinatura + validação XSD local | 3-5 dias | DPS assinado que passa `xmllint --schema` + `xmlsec1 --verify` |
| **0** | Setup infra (vitest, deps, docs, conta homologação) | 2 dias | Testes rodam, schemas baixados, conta gov.br ativa |
| **1A** | Schema Prisma + CRUD Clientes MEI + upload de certificado | 1 semana | Tela "Clientes MEI" funcional com cert cifrado |
| **1B** | Catálogo NBS + Parâmetros Municipais + numeração de DPS | 3-4 dias | Seed de códigos NBS no DB + consulta à API de parâmetros |
| **2** | DPS Builder completo baseado no XSD + validação XSD local | 1-2 semanas | Geração de DPS válido por schema + cobertura de testes ≥90% |
| **3** | XMLDSIG + GZip+Base64 + mTLS client + primeira emissão em homologação | 1-2 semanas | 1 NFS-e autorizada em produção restrita |
| **4** | Consulta/reconciliação + DANFS-e download + storage do XML/PDF | 1 semana | Usuário baixa PDF de NFS-e emitida |
| **5** | UX "1-clique" (form inteligente + memória + BrasilAPI + autocomplete) | 1 semana | Reemitir nota com 2 cliques + ajustar valor |
| **6** | Regras MEI (limite R$81k + monitoramento + alertas + desenquadramento) | 3-4 dias | Bloqueio/alerta antes de exceder limite |
| **7** | Cancelamento + substituição + histórico + relatórios + export ZIP | 1 semana | Ciclo de vida completo da NFS-e |
| **8** | Observabilidade + prod cutover + smoke test + rollback plan | 3-4 dias | Sistema em produção com monitoramento |

**Total realista: 12-16 semanas (3-4 meses).**

Este documento detalha em profundidade as Fases -1, 0, 1A, 1B e 2. Fases 3-8 estão mapeadas em alto nível com arquivos e entregáveis, mas serão expandidas conforme aprendermos com o ambiente de homologação real — tentar detalhar tudo agora é especulação.

---

## File Structure

```
src/lib/nfse/
├── types.ts                    # Dps, Prestador, Tomador, Servico, NfseResponse
├── constants.ts                # URLs, códigos, enums (SEFIN_BASE_HOMOLOG, etc)
├── dps-id.ts                   # buildIdDps, validateIdDps
├── dps-builder.ts              # constrói objeto Dps a partir de input
├── dps-validator.ts            # validação Zod profunda baseada no XSD
├── xml-builder.ts              # Dps → XML (xmlbuilder2, namespace correto)
├── xml-signer.ts               # assina infDPS via xml-crypto
├── pfx-loader.ts               # parseia .pfx (node-forge)
├── pack.ts                     # GZip + Base64
├── unpack.ts                   # Base64 + GunZip (pra parsear resposta)
├── mtls-client.ts              # https.Agent com cert do prestador
├── sefin-client.ts             # POST /nfse, GET /nfse/{chave}, HEAD /dps/{id}
├── parametros-municipais.ts    # GET /parametros_municipais/*
├── eventos-client.ts           # POST /nfse/{chave}/eventos
├── response-parser.ts          # parser do XML de retorno + error mapping
├── prepare-submission.ts       # orquestra build + sign + pack
├── submit.ts                   # orquestra mTLS + POST + parse
└── __tests__/
    ├── fixtures/               # samples XML oficiais + cert self-signed
    ├── dps-id.test.ts
    ├── dps-builder.test.ts
    ├── xml-builder.test.ts     # valida contra XSD oficial
    ├── xml-signer.test.ts      # valida via xmlsec1
    ├── pfx-loader.test.ts
    ├── pack.test.ts
    └── prepare-submission.test.ts

src/lib/nbs/
├── types.ts                    # CodigoTributacaoNacional
├── seed.ts                     # importa da planilha anexo_b
└── search.ts                   # busca por palavra-chave

src/lib/actions/
├── clientes-mei.ts             # CRUD
├── certificados.ts             # upload, listar, rotacionar
├── nfse.ts                     # criar, listar, cancelar, substituir
├── servicos-memorizados.ts     # CRUD + contador de uso
├── parametros-municipais.ts    # wrapper cacheado da API
└── mei-limite.ts               # monitoramento de faturamento anual

src/app/(protected)/
├── clientes-mei/
│   ├── page.tsx
│   ├── clientes-mei-content.tsx
│   └── [id]/
│       ├── page.tsx
│       └── cliente-detail.tsx
└── nfse/
    ├── page.tsx
    ├── nfse-content.tsx
    ├── nova/
    │   ├── page.tsx
    │   └── nova-nfse-form.tsx  # form inteligente com memória
    └── [id]/
        ├── page.tsx
        └── nfse-detail.tsx

src/app/api/
└── webhooks/
    └── nfse-reconciliation/
        └── route.ts            # cron pra reconciliar DPS pendentes

src/worker/handlers/
├── emit-nfse.ts                # handler BullMQ
└── reconcile-pending.ts        # job periódico

prisma/schema.prisma             # novos models
scripts/
├── nfse-sanity-check.ts        # spike local (xmllint + xmlsec1)
├── seed-nbs.ts                 # importa NBS do XLSX
└── test-submit-homolog.ts      # teste manual contra produção restrita

docs/nfse/
├── reference/                  # XSDs, manuais, notas
├── adr-001-direct-integration.md
└── spike-findings.md           # resultados do spike
```

---

## Fase -1: Spike Técnico (3-5 dias)

**Objetivo:** Antes de comprometer 3-4 meses de trabalho, provar que conseguimos gerar um DPS assinado que (a) passa validação pelo XSD oficial local, (b) passa validação de assinatura via xmlsec1, e (c) é aceito pelo endpoint de produção restrita. Se algo aqui falhar, reavaliamos o plano inteiro.

### Task -1.1: Instalar dependências de desenvolvimento e runtime

**Files:**
- Modify: `nexus-nfe/package.json`

- [ ] **Step 1: Instalar libs de runtime**

```bash
cd "/Users/joaovitorzanini/Desktop/Claude Code/nexus-nfe"
npm install node-forge xml-crypto xmlbuilder2
npm install -D @types/node-forge vitest @vitest/ui
```

- [ ] **Step 2: Instalar CLI tools de validação (macOS)**

```bash
brew install libxml2 xmlsec1
which xmllint xmlsec1
```

Expected: paths válidos (geralmente `/opt/homebrew/bin/xmllint` e `/opt/homebrew/bin/xmlsec1`).

- [ ] **Step 3: Adicionar scripts de teste no package.json**

Edit `package.json` adicionando em `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui"
```

- [ ] **Step 4: Criar `vitest.config.ts`**

Write `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore(nfse): deps e infra de testes pro spike"
```

### Task -1.2: Mapear estrutura real do DPS baseado no XSD

**Files:**
- Read only: `docs/nfse/reference/schemas/Schemas/1.01/`
- Already created: `docs/nfse/reference/dps-schema-notes.md`

- [ ] **Step 1: Ler DPS_v1.01.xsd + tiposComplexos_v1.01.xsd + tiposSimples_v1.01.xsd e confirmar tudo que está em `dps-schema-notes.md`**

Verificar em particular: tipos `TCServ`, `TCInfoValores`, `TCRTCInfoIBSCBS`. Atualizar as notas se algo estiver incompleto.

- [ ] **Step 2: Identificar o conjunto MÍNIMO de campos obrigatórios pra um DPS de MEI em cenário comum:**

  - MEI do DF prestando serviço a uma pessoa física do DF
  - Sem retenções, sem substituição, sem intermediário
  - Valor simples, alíquota ISS do DF, serviço dentro do município

Documentar esse cenário em `docs/nfse/reference/cenario-minimo-mei-df.md` com o XML esperado literal.

- [ ] **Step 3: Commit das notas**

```bash
git add docs/nfse/reference/
git commit -m "docs(nfse): mapeamento do cenário mínimo DPS MEI-DF"
```

### Task -1.3: Implementar pfx-loader + tests

Detalhes idênticos ao que estava no plano v1 Task 1.4. Copiar tal qual. Arquivo `src/lib/nfse/pfx-loader.ts` + teste gerando .pfx self-signed via `node-forge` dentro do próprio teste (sem fixture no disco).

Critério de saída: teste de `parsePfx` passa com cert self-signed, falha com senha errada, extrai CN e thumbprint corretamente.

### Task -1.4: Implementar xml-builder BASEADO NO XSD REAL

**Files:**
- Create: `src/lib/nfse/types.ts`
- Create: `src/lib/nfse/dps-id.ts` + teste
- Create: `src/lib/nfse/xml-builder.ts` + teste
- Create: `src/lib/nfse/__tests__/fixtures/cenario-minimo-mei-df.xml`

- [ ] **Step 1: Types baseados no XSD real**

Write `src/lib/nfse/types.ts` espelhando a hierarquia confirmada em `dps-schema-notes.md`. Tipos: `Dps`, `InfDps`, `Prestador` (com `regTrib` obrigatório), `Tomador`, `Servico`, `LocalPrestacao`, `CodigoServico`, `Valores`, `Substituicao`, `Endereco`, `EnderecoNacional`, `RegimeTributario`.

Use enums TypeScript pros códigos discretos: `TipoAmbiente` (1=prod, 2=homolog), `TipoEmitente` (1|2|3), `OpcaoSimplesNacional` (1=não, 2=MEI, 3=ME/EPP), `RegimeEspecialTributacao` (0-9).

- [ ] **Step 2: Implementar `dps-id.ts` + testes**

Função `buildIdDps({ cLocEmi, tpInsc, cnpjCpf, serie, nDps }): string` que gera o Id de 44 chars. Testes: formato, padding de zeros, validação de tamanhos, lançar erro se inconsistente.

- [ ] **Step 3: Implementar `xml-builder.ts` baseado no cenário mínimo + cobertura incremental**

Primeiro build cobre só cenário mínimo (Task -1.2 Step 2). Depois estende pra cenários adicionais conforme tasks posteriores.

Test strategy:
1. Teste 1: gera XML do cenário mínimo → salva em `/tmp/dps-test.xml` → roda `xmllint --schema docs/nfse/reference/schemas/Schemas/1.01/DPS_v1.01.xsd /tmp/dps-test.xml` via `child_process.execSync` → espera `validates`. **Esse teste é o critério de aceitação da tarefa.**
2. Testes de unidade: namespace, Id attribute no `infDPS`, presença de cada elemento obrigatório, ordem dos elementos (XSD é ordenado).

- [ ] **Step 4: Loop até XSD validar**

Rodar o teste de integração contra o XSD. Vai falhar várias vezes. Corrigir o builder até passar. Anotar cada erro em `docs/nfse/spike-findings.md`.

- [ ] **Step 5: Commit do builder validado**

```bash
git add src/lib/nfse/types.ts src/lib/nfse/dps-id.ts src/lib/nfse/xml-builder.ts src/lib/nfse/__tests__/ docs/nfse/spike-findings.md
git commit -m "feat(nfse): DPS builder validado contra XSD oficial v1.01"
```

### Task -1.5: Implementar xml-signer + validar com xmlsec1

**Files:**
- Create: `src/lib/nfse/xml-signer.ts`
- Create: `src/lib/nfse/__tests__/xml-signer.test.ts`

- [ ] **Step 1: Implementar signer usando xml-crypto**

Parâmetros:
- Canonicalização: `http://www.w3.org/TR/2001/REC-xml-c14n-20010315`
- Digest: `http://www.w3.org/2001/04/xmlenc#sha256`
- Signature: `http://www.w3.org/2001/04/xmldsig-more#rsa-sha256`
- Referência ao elemento `infDPS` via xpath
- Inclui `X509Certificate` no `KeyInfo`

- [ ] **Step 2: Teste que roda xmlsec1 pra verificar assinatura**

Test:
1. Gera cert self-signed
2. Builda XML do cenário mínimo
3. Assina
4. Salva em `/tmp/dps-signed.xml`
5. Roda `xmlsec1 --verify --pubkey-cert-pem /tmp/cert.pem /tmp/dps-signed.xml`
6. Espera exit 0

- [ ] **Step 3: Loop até assinatura validar**

Problemas esperados: canonicalização (xml-crypto tem quirks), ordem dos elementos dentro de `Signature`, formato do X509Certificate (sem BEGIN/END).

- [ ] **Step 4: Commit**

```bash
git add src/lib/nfse/xml-signer.ts src/lib/nfse/__tests__/xml-signer.test.ts
git commit -m "feat(nfse): XMLDSIG signer validado via xmlsec1"
```

### Task -1.6: Pack + orquestrador + script de smoke

**Files:**
- Create: `src/lib/nfse/pack.ts` + teste
- Create: `src/lib/nfse/prepare-submission.ts` + teste
- Create: `scripts/nfse-sanity-check.ts`

- [ ] **Step 1: Implementar pack.ts (GZip + Base64) e teste de round-trip**

Trivial. Use `zlib.gzipSync` nativo.

- [ ] **Step 2: Orquestrador `prepareSubmission(dps, pfxBuffer, senha): { idDps, xmlAssinado, xmlPacked, thumbprint }`**

Cola tudo: `parsePfx` → `buildDpsXml` → `signDps` → `packDps`.

- [ ] **Step 3: Script `scripts/nfse-sanity-check.ts`**

```typescript
// Executável standalone: npx tsx scripts/nfse-sanity-check.ts
// 1. Lê um .pfx de teste (ou gera um self-signed)
// 2. Constrói DPS do cenário mínimo
// 3. Roda prepareSubmission
// 4. Salva xmlAssinado em /tmp/dps-sanity.xml
// 5. Roda xmllint --schema contra /tmp/dps-sanity.xml
// 6. Roda xmlsec1 --verify /tmp/dps-sanity.xml
// 7. Imprime "OK SPIKE" se tudo passar
```

- [ ] **Step 4: Rodar o script**

Expected: `OK SPIKE` na saída. **Se não passar, volta pras Tasks -1.4/-1.5 e itera.**

- [ ] **Step 5: Commit**

```bash
git add src/lib/nfse/pack.ts src/lib/nfse/prepare-submission.ts scripts/nfse-sanity-check.ts src/lib/nfse/__tests__/
git commit -m "feat(nfse): spike local completo — DPS assinado validado"
```

### Task -1.7: Pesquisa sobre DANFS-e PDF

- [ ] **Step 1: Investigar via Swagger do ambiente de produção restrita**

Manual: acessar `https://adn.producaorestrita.nfse.gov.br/contribuintes/docs/index.html` no browser e procurar endpoints que retornam PDF do DANFS-e a partir da chave de acesso. Se existir, documentar o endpoint + formato de resposta em `docs/nfse/reference/danfse-api.md`.

- [ ] **Step 2: Plano B se não houver API de DANFS-e**

Se o ADN não tiver endpoint de PDF:
- Opção B1: Usar `puppeteer` pra renderizar um template HTML com os dados do XML autorizado
- Opção B2: Usar `pdfmake` ou `@react-pdf/renderer` com template custom
- Opção B3: Usar `pdfkit` (mais leve)

Documentar decisão em `docs/nfse/reference/danfse-decision.md`. **Recomendação:** confirmar antes de entrar na Fase 4.

- [ ] **Step 3: Commit**

```bash
git add docs/nfse/reference/
git commit -m "docs(nfse): decisão sobre geração do DANFS-e PDF"
```

### Task -1.8: Gate de decisão da Fase -1

**Critério:** Se Tasks -1.1 a -1.7 passarem, a Fase -1 é considerada concluída e as Fases 0 em diante podem começar com confiança. Se houver bloqueio técnico não resolvido (ex.: xml-crypto incompatível com canonicalização da Receita), reavaliar usando bibliotecas alternativas ou chamar via `xmlsec1` CLI.

Escrever resumo do spike em `docs/nfse/reference/spike-findings.md` cobrindo:
- O que funcionou
- Problemas encontrados e soluções
- Decisões técnicas tomadas (ex: canonicalização exata, fonte da timestamp)
- Próximos riscos conhecidos pra Fase 3 (mTLS real)

---

## Fase 0: Setup (2 dias)

### Task 0.1: Baixar referências oficiais
**JÁ FEITO.** Arquivos em `docs/nfse/reference/`:
- `manual-contribuintes-v1-2.pdf`
- `anexo-i-dps-layout.xlsx`
- `anexo-b-nbs.xlsx`
- `schemas/` (pasta extraída)
- `dps-schema-notes.md`

- [ ] **Step 1: Adicionar ao .gitignore**

Append:
```
docs/nfse/reference/*.pdf
docs/nfse/reference/*.xlsx
docs/nfse/reference/*.zip
```

Commitar apenas os XSDs + notas + markdown de referência.

### Task 0.2: Conta de homologação gov.br

- [ ] **Step 1: (Manual) Aderir ao Sistema Nacional NFS-e com CNPJ de teste**

Passos (fazer no navegador):
1. Acessar `https://www.gov.br/nfse/pt-br`
2. Fazer login gov.br com conta Prata ou Ouro
3. Cadastrar CNPJ de teste (usar o próprio MEI do usuário em homologação, se ele tiver, ou criar conta de teste conforme instruções do portal)
4. Obter credenciais e confirmação de acesso ao ambiente de produção restrita

- [ ] **Step 2: Obter certificado A1 de teste**

Pode ser: (a) certificado real do MEI do usuário, (b) certificado A1 de teste comprado especificamente pra dev (R$80-180), (c) certificado gratuito de teste se a Receita disponibilizar (verificar no portal).

Salvar o `.pfx` em `docs/nfse/reference/fixtures/` (que está no .gitignore — nunca commitar).

- [ ] **Step 3: Documentar decisões em ADR-001**

Write `docs/nfse/adr-001-direct-integration.md` seguindo o modelo ADR: Contexto, Decisão, Consequências, Alternativas rejeitadas, Status.

- [ ] **Step 4: Commit do ADR**

```bash
git add docs/nfse/adr-001-direct-integration.md
git commit -m "docs(nfse): ADR-001 integração direta sem gateway"
```

---

## Fase 1A: Schema + CRUD Clientes MEI + Certificados (1 semana)

### Task 1A.1: Estender schema Prisma

**Files:** `prisma/schema.prisma`

- [ ] **Step 1: Adicionar enums**

```prisma
enum AmbienteNfse {
  producao_restrita
  producao
}

enum NfseStatus {
  rascunho
  pendente
  processando
  autorizada
  rejeitada
  cancelada
  substituida
  erro
}

enum RegimeTributarioMei {
  mei
}
```

- [ ] **Step 2: Model `ClienteMei`**

```prisma
model ClienteMei {
  id                 String   @id @default(uuid()) @db.Uuid
  cnpj               String   @unique                         // 14 dígitos
  razaoSocial        String   @map("razao_social")
  nomeFantasia       String?  @map("nome_fantasia")
  inscricaoMunicipal String?  @map("inscricao_municipal")
  email              String?
  telefone           String?
  cep                String                                   // 8 dígitos
  logradouro         String
  numero             String
  complemento        String?
  bairro             String
  municipioIbge      String   @map("municipio_ibge")          // 7 dígitos
  uf                 String   @db.Char(2)
  regimeTributario   RegimeTributarioMei @default(mei) @map("regime_tributario")
  codigoServicoPadrao String? @map("codigo_servico_padrao")
  serieDpsAtual      String   @default("00001") @map("serie_dps_atual")
  ultimoNumeroDps    Int      @default(0) @map("ultimo_numero_dps")
  isActive           Boolean  @default(true) @map("is_active")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")
  createdById        String   @map("created_by") @db.Uuid

  certificados        CertificadoDigital[]
  nfses               Nfse[]
  servicosMemorizados ServicoMemorizado[]
  tomadoresFavoritos  TomadorFavorito[]
  faturamentoAnual    FaturamentoAnual[]

  @@map("clientes_mei")
}
```

Note: `serieDpsAtual` + `ultimoNumeroDps` implementam a numeração contínua por prestador — a decisão de negócio é **série única padrão `00001`, numeração contínua desde a primeira nota, sem reset**.

- [ ] **Step 3: Model `CertificadoDigital`**

```prisma
model CertificadoDigital {
  id             String   @id @default(uuid()) @db.Uuid
  clienteMeiId   String   @map("cliente_mei_id") @db.Uuid
  nomeArquivo    String   @map("nome_arquivo")
  pfxEncrypted   String   @map("pfx_encrypted")               // AES-256-GCM
  senhaEncrypted String   @map("senha_encrypted")
  commonName     String   @map("common_name")
  thumbprint     String   @unique                             // SHA-1 hex
  notBefore      DateTime @map("not_before")
  notAfter       DateTime @map("not_after")
  revoked        Boolean  @default(false)
  createdAt      DateTime @default(now()) @map("created_at")

  clienteMei ClienteMei @relation(fields: [clienteMeiId], references: [id], onDelete: Cascade)

  @@index([clienteMeiId, notAfter], name: "idx_cert_cliente_exp")
  @@map("certificados_digitais")
}
```

- [ ] **Step 4: Model `Nfse` (campos alinhados com o XSD)**

```prisma
model Nfse {
  id               String       @id @default(uuid()) @db.Uuid
  clienteMeiId     String       @map("cliente_mei_id") @db.Uuid
  ambiente         AmbienteNfse
  status           NfseStatus   @default(rascunho)

  // Identificação DPS
  idDps            String       @unique @map("id_dps")        // 44 chars
  serie            String
  numero           String
  dataEmissao      DateTime     @map("data_emissao")
  dataCompetencia  DateTime     @map("data_competencia") @db.Date

  // Serviço
  descricaoServico String       @map("descricao_servico") @db.Text
  codigoServico    String       @map("codigo_servico")        // cTribNac
  codigoNbs        String?      @map("codigo_nbs")            // opcional pra MEI
  localPrestacaoIbge String     @map("local_prestacao_ibge")
  valorServico     Decimal      @db.Decimal(15, 2) @map("valor_servico")
  aliquotaIss      Decimal      @db.Decimal(5, 2) @map("aliquota_iss")
  valorIss         Decimal      @db.Decimal(15, 2) @map("valor_iss")

  // Tomador
  tomadorTipo      String       @map("tomador_tipo")          // cpf | cnpj
  tomadorDocumento String       @map("tomador_documento")
  tomadorNome      String       @map("tomador_nome")
  tomadorEmail     String?      @map("tomador_email")
  tomadorEndereco  Json?        @map("tomador_endereco") @db.JsonB

  // Substituição
  substitutaDe     String?      @map("substituta_de") @db.Uuid
  motivoSubstituicao String?    @map("motivo_substituicao")

  // Resposta da API
  xmlAssinado      String?      @map("xml_assinado") @db.Text
  xmlAutorizado    String?      @map("xml_autorizado") @db.Text
  pdfBase64        String?      @map("pdf_base64") @db.Text
  chaveAcesso      String?      @unique @map("chave_acesso")
  numeroNfse       String?      @map("numero_nfse")
  dataAutorizacao  DateTime?    @map("data_autorizacao")
  codigoResposta   String?      @map("codigo_resposta")
  mensagemResposta String?      @map("mensagem_resposta") @db.Text

  // Auditoria
  tentativas       Int          @default(0)
  ultimoErro       String?      @map("ultimo_erro") @db.Text
  createdAt        DateTime     @default(now()) @map("created_at")
  updatedAt        DateTime     @updatedAt @map("updated_at")
  createdById      String       @map("created_by") @db.Uuid

  clienteMei ClienteMei @relation(fields: [clienteMeiId], references: [id], onDelete: Restrict)

  @@index([clienteMeiId, createdAt(sort: Desc)], name: "idx_nfse_cliente")
  @@index([status, createdAt], name: "idx_nfse_status")
  @@index([chaveAcesso], name: "idx_nfse_chave")
  @@map("nfses")
}
```

- [ ] **Step 5: Models `ServicoMemorizado`, `TomadorFavorito`, `FaturamentoAnual`, `CodigoTributacaoNacional`**

Esses 4 models cobrem: UX 1-clique (serviços e tomadores salvos), monitoramento do limite MEI, catálogo NBS.

```prisma
model ServicoMemorizado {
  id                String     @id @default(uuid()) @db.Uuid
  clienteMeiId      String     @map("cliente_mei_id") @db.Uuid
  apelido           String
  descricaoServico  String     @map("descricao_servico") @db.Text
  valorPadrao       Decimal    @db.Decimal(15, 2) @map("valor_padrao")
  codigoServico     String     @map("codigo_servico")
  codigoNbs         String?    @map("codigo_nbs")
  localPrestacaoIbge String    @default("5300108") @map("local_prestacao_ibge")
  usoCount          Int        @default(0) @map("uso_count")
  ultimoUso         DateTime?  @map("ultimo_uso")
  createdAt         DateTime   @default(now()) @map("created_at")
  updatedAt         DateTime   @updatedAt @map("updated_at")

  clienteMei ClienteMei @relation(fields: [clienteMeiId], references: [id], onDelete: Cascade)

  @@unique([clienteMeiId, apelido])
  @@index([clienteMeiId, ultimoUso(sort: Desc)], name: "idx_servico_recente")
  @@map("servicos_memorizados")
}

model TomadorFavorito {
  id          String     @id @default(uuid()) @db.Uuid
  clienteMeiId String    @map("cliente_mei_id") @db.Uuid
  tipo        String                                             // cpf | cnpj
  documento   String
  nome        String
  email       String?
  endereco    Json?      @db.JsonB
  usoCount    Int        @default(0) @map("uso_count")
  ultimoUso   DateTime?  @map("ultimo_uso")
  createdAt   DateTime   @default(now()) @map("created_at")

  clienteMei ClienteMei @relation(fields: [clienteMeiId], references: [id], onDelete: Cascade)

  @@unique([clienteMeiId, documento])
  @@index([clienteMeiId, ultimoUso(sort: Desc)], name: "idx_tomador_recente")
  @@map("tomadores_favoritos")
}

model FaturamentoAnual {
  id                String     @id @default(uuid()) @db.Uuid
  clienteMeiId      String     @map("cliente_mei_id") @db.Uuid
  ano               Int
  totalEmitido      Decimal    @db.Decimal(15, 2) @map("total_emitido") @default(0)
  quantidadeNotas   Int        @default(0) @map("quantidade_notas")
  limiteExcedido    Boolean    @default(false) @map("limite_excedido")
  alertaEnviado     Boolean    @default(false) @map("alerta_enviado")
  updatedAt         DateTime   @updatedAt @map("updated_at")

  clienteMei ClienteMei @relation(fields: [clienteMeiId], references: [id], onDelete: Cascade)

  @@unique([clienteMeiId, ano])
  @@map("faturamento_anual")
}

model CodigoTributacaoNacional {
  codigo      String   @id                                        // ex: "1.01"
  descricao   String   @db.Text
  aliquotaMin Decimal? @db.Decimal(5, 2) @map("aliquota_min")
  aliquotaMax Decimal? @db.Decimal(5, 2) @map("aliquota_max")
  nivel       Int                                                 // 1=item, 2=subitem
  parentCodigo String? @map("parent_codigo")

  @@index([descricao], name: "idx_nbs_descricao")
  @@map("codigos_tributacao_nacional")
}
```

- [ ] **Step 6: Gerar migration**

```bash
cd nexus-nfe
DATABASE_URL="postgresql://nexus:nexus@localhost:5435/nexus_nfe" npx prisma migrate dev --name add_nfse_models
npx prisma generate
```

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(nfse): schema com 7 models (Cliente, Cert, Nfse, Servico, Tomador, Faturamento, NBS)"
```

### Task 1A.2: Actions de Clientes MEI + UI

*Detalhamento análogo ao plano v1 Tasks 1.2 e 1.3, com ajustes:*
- Actions: `listClientesMei`, `createClienteMei`, `getClienteMei`, `updateClienteMei`, `deleteClienteMei` (soft delete)
- Auto-preenchimento via BrasilAPI `https://brasilapi.com.br/api/cnpj/v1/{cnpj}` com fallback pra digitação manual
- Select de município: DF é um único município (`5300108 - Brasília`), pré-selecionar
- UI seguindo padrão dos users-content.tsx existente (Table + Dialog + AlertDialog + BadgeSelect)
- Testes de actions com vitest e mock de `getCurrentUser`

### Task 1A.3: Upload e gestão de certificado

- Action `uploadCertificado(input)` parseando via `pfxLoader`, validando CNPJ do cert bate com do cliente, validando validade, cifrando PFX + senha via `encrypt()` do módulo existente, armazenando em `CertificadoDigital`. Revoga certs anteriores do mesmo cliente.
- Action `loadCertificadoForSigning(clienteMeiId)` — **só pra uso interno do worker**, nunca expor via client component
- Action `listCertificados(clienteMeiId)` pra exibir histórico
- UI: seção "Certificado Digital" no `cliente-detail.tsx` com badge do status (válido/expirado/expirando) + botão "Substituir"
- Job cron diário que verifica `notAfter - 30 dias` e cria notificação via módulo `notifications` existente

---

## Fase 1B: Catálogo NBS + Parâmetros Municipais + Numeração (3-4 dias)

### Task 1B.1: Seed da tabela `CodigoTributacaoNacional`

**Files:**
- Create: `scripts/seed-nbs.ts`
- Create: `docs/nfse/reference/nbs-parsed.json` (output do parser, pra inspeção)

- [ ] **Step 1: Parser da planilha `anexo_b-nbs.xlsx`**

Usar `xlsx` (npm) pra ler a planilha. Extrair colunas: código, descrição, níveis (item / subitem), alíquota sugerida.

- [ ] **Step 2: Script de seed**

```typescript
// scripts/seed-nbs.ts
// Lê docs/nfse/reference/anexo-b-nbs.xlsx
// Insere em prisma.codigoTributacaoNacional via upsert
// Rodar: npx tsx scripts/seed-nbs.ts
```

- [ ] **Step 3: Rodar o seed**

Expected: ~198 linhas inseridas.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-nbs.ts
git commit -m "feat(nfse): seed do catálogo de códigos de tributação nacional (LC 116/2003)"
```

### Task 1B.2: Component de busca de código NBS

**Files:**
- Create: `src/lib/actions/nbs.ts` — `searchNbs(query: string)`
- Create: `src/components/nfse/nbs-selector.tsx` — input com autocomplete + debounce

Busca fuzzy por descrição (ILIKE) retornando top 20. UI mostra código + descrição truncada + aliquotaMin-Max se disponível. Favoritos do cliente aparecem no topo.

### Task 1B.3: Cache de parâmetros municipais

**Files:**
- Create: `src/lib/nfse/parametros-municipais.ts`
- Create: `src/lib/actions/parametros-municipais.ts`

Wrapper que consulta `GET /parametros_municipais/{cMun}/convenio` e `GET /parametros_municipais/{cMun}/{cServ}`, cacheia em Redis com TTL de 24h (raramente mudam), retorna alíquota oficial pro cálculo do ISS.

**Importante:** essa chamada também exige mTLS. Usa o `mtls-client.ts` (que será criado na Fase 3). Durante Fase 1B pode mockar — integração real acontece na Fase 3.

### Task 1B.4: Numeração atômica de DPS

- Action `reservarProximoNumeroDps(clienteMeiId)` que roda em transação Prisma: lê `ultimoNumeroDps`, incrementa, atualiza, retorna. Evita race condition com `SELECT FOR UPDATE`.
- Série padrão `00001` (uma única série por prestador é o mais simples e atende MEI).

---

## Fase 2: DPS Builder completo + cobertura ≥90% (1-2 semanas)

Expande o spike da Fase -1.4 pra cobrir TODOS os cenários previstos no XSD:
- Tomador com endereço opcional
- Tomador pessoa jurídica (CNPJ)
- Tomador com endereço no exterior (TCEnderExt)
- Intermediário
- Substituição (campo `subst`)
- Diferentes códigos de serviço
- Cenários de retenção de ISS
- IBSCBS (reforma tributária — grupo opcional)

Testes:
- Unidade pra cada campo/variação
- Integração: cada cenário gera XML que passa no `xmllint --schema` (automatizado no test)
- Cobertura mínima 90% via `vitest --coverage`

Entregável: `xml-builder.ts` completo + `dps-validator.ts` (Zod) que valida input ANTES de gerar XML.

---

## Fase 3: Transport mTLS + primeira emissão em homologação (1-2 semanas)

**Entregáveis:**
- `src/lib/nfse/mtls-client.ts` — `createHttpsAgent(pfxBuffer, senha): https.Agent`
- `src/lib/nfse/sefin-client.ts` — `submitNfse`, `getNfse`, `headDps` (HTTP client tipado)
- `src/lib/nfse/eventos-client.ts` — `postEvento` pra cancelamento e substituição
- `src/lib/nfse/response-parser.ts` — parser do XML retornado + mapeamento de códigos de erro
- `src/worker/handlers/emit-nfse.ts` — handler BullMQ
- `src/lib/actions/nfse.ts` — `criarNfse`, `listarNfses`, `getNfse`
- Teste de integração real contra `sefin.producaorestrita.nfse.gov.br` com certificado A1 real

**Critério de saída:** uma NFS-e autorizada em produção restrita, com chave de acesso, salva no banco com `status=autorizada`, XML retornado armazenado em `xmlAutorizado`.

**Observações do manual:**
- Emissão é síncrona → worker só desacopla UI
- Reconciliação: se worker crashar após submit mas antes de salvar, job de reconciliação roda `HEAD /dps/{id}` pra saber se já foi processada. Se sim, roda `GET /nfse/{chave}` pra recuperar.

---

## Fase 4: Consulta + DANFS-e + download (1 semana)

**Entregáveis:**
- UI `/nfse` — tabela de histórico com filtros (cliente, período, status)
- UI `/nfse/[id]` — detalhes + botão "Baixar XML" + "Baixar PDF"
- Endpoint server action `downloadXml(id)` — retorna XML autorizado
- Endpoint server action `downloadPdf(id)` — retorna DANFS-e (fonte definida no spike -1.7)
- Storage: decidir se persiste PDF no banco (Nfse.pdfBase64) ou em filesystem/S3-compatible
- Job de reconciliação cron que pega Nfses em status `processando` há mais de 5min e roda `HEAD /dps/{id}`

---

## Fase 5: UX do form inteligente + memória + 1-clique (1 semana)

**Entregáveis:**
- `src/app/(protected)/nfse/nova/nova-nfse-form.tsx` — form multi-step com:
  - Step 1: Selecionar cliente MEI (autocomplete por nome/CNPJ, últimos usados no topo)
  - Step 2: Selecionar serviço (sugestões baseadas em `ServicoMemorizado` ordenados por `ultimoUso`, ou "novo serviço")
  - Step 3: Selecionar tomador (autocomplete de `TomadorFavorito`, BrasilAPI pra CNPJ, ou digitação manual)
  - Step 4: Revisar valores (pré-preenchido do serviço memorizado, editável)
  - Step 5: Confirmar e emitir
- Botão "Emitir novamente" em cada NFS-e passada → cria rascunho pré-preenchido
- Atalhos de teclado: `Ctrl+N` nova nota, `Ctrl+Enter` emitir, `Esc` cancelar
- Salvar serviço como "Memorizado" após primeira emissão com opção de apelido
- Incrementar contador `usoCount` + `ultimoUso` em cada uso
- `ServicoMemorizado` favoritos aparecem em painel na tela principal de `/nfse`

Essa é a feature que o usuário descreveu como central. Prioridade alta.

---

## Fase 6: Regras de negócio MEI (3-4 dias)

**Entregáveis:**
- `src/lib/actions/mei-limite.ts`:
  - `getFaturamentoAno(clienteMeiId, ano)` — consulta `FaturamentoAnual` e `nfses` autorizadas
  - `atualizarFaturamentoPos(clienteMeiId, valor)` — chamado após cada emissão autorizada (via outbox event)
  - `verificarLimiteAntesDeEmitir(clienteMeiId, valorNovaEmissao)` — retorna `{ podeEmitir: boolean, avisos: string[] }` baseado em:
    - Se totalEmitido + novaEmissao <= 80% do limite → OK
    - Entre 80% e 100% → warning
    - Entre 100% e 120% → warning forte + ainda permite (dentro dos 20% tolerados por DASN)
    - Acima de 120% → bloqueia com mensagem explicando desenquadramento retroativo
- Constante `LIMITE_MEI_ANUAL_2026 = 81000` (atualizar anualmente via settings)
- UI: banner no topo de `/nfse` mostrando "Você emitiu X de R$81k este ano (Y%)" com cor gradativa
- Notificação automática quando atingir 80% e 100% do limite (via módulo notifications)

### Task 6.1+: Detalhes a serem expandidos

A/B testing sobre se bloquear ou só alertar quando exceder o limite é decisão do usuário. Default recomendado: **alerta forte mas permite** dentro da zona 0-120% (a Receita tolera até 20%); bloqueia acima.

---

## Fase 7: Cancelamento + substituição + histórico + export (1 semana)

**Entregáveis:**
- `src/lib/actions/nfse.ts`:
  - `cancelarNfse(id, motivo)` — chama `POST /nfse/{chave}/eventos` com tipo cancelamento; só permite dentro do prazo legal (geralmente 24h, verificar regras)
  - `substituirNfse(idOriginal, novosDados)` — cria novo rascunho com `substitutaDe` preenchido; ao emitir, inclui `subst.chSubstda` no DPS
- Relatório mensal por cliente (total emitido, quantidade, impostos, situação do limite)
- Export ZIP de XMLs de um período (`/nfse?export=zip&inicio=...&fim=...`)
- Histórico paginado com filtros avançados

---

## Fase 8: Observabilidade + cutover produção (3-4 dias)

**Entregáveis:**
- Logs estruturados em todas as operações NFS-e via pino ou console.log formatado (sem dados sensíveis: nada de senha, pfx, nem CNPJ em log claro)
- Metrics: contagem de emissões autorizadas/rejeitadas/por cliente, latência média do endpoint SEFIN
- Alertas: webhook pro Slack/email quando (a) worker falhar 3x consecutivas, (b) > 10% de rejeições em 1h, (c) endpoint SEFIN lento > 10s
- Configuração `AMBIENTE_NFSE=producao` via env var + UI toggle pra super admin (com confirmação)
- Smoke test em produção: emitir 1 nota real do MEI do usuário com valor simbólico (R$1)
- Rollback plan: se der problema, toggle de volta pra homologação + comunicação

---

## Decisões explícitas (não reabrir sem discussão)

1. **Certificado por cliente** (opção A), não procuração eletrônica da Nexus. Cada MEI traz seu A1.
2. **Série única `00001`** por cliente MEI, numeração contínua sem reset.
3. **Escopo inicial: só NFS-e**, não NF-e de produtos.
4. **Single-tenant permanente** (já decidido na fase de brainstorming do projeto).
5. **Emissão síncrona** com worker BullMQ apenas pra desacoplar UI, não pra polling.
6. **Namespace fixo** `http://www.sped.fazenda.gov.br/nfse`, schema v1.01.
7. **Cenário mínimo inicial:** MEI do DF → pessoa física ou jurídica do DF → serviço dentro do município, sem retenções, sem intermediário, sem exterior.

---

## Riscos (atualizados pós-pesquisa)

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Canonicalização XMLDSIG do `xml-crypto` incompatível com a Receita | Média | Alto | Spike -1.5 resolve antes de tudo. Plano B: chamar `xmlsec1` CLI via child_process |
| Manual oficial atualizar mid-projeto | Alta | Médio | Monitorar `gov.br/nfse/documentacao-atual` semanalmente; versionar schemas |
| Ambiente de produção restrita instável | Média | Médio | Testes mockados localmente (XSD + xmlsec1); só contata homologação em pontos críticos |
| Certificado A1 de teste não disponível pra dev | Média | Alto | Gerar self-signed pra testes locais; usar cert real só no spike da Fase 3 |
| API de DANFS-e não existe no ADN | Desconhecida | Médio | Spike Task -1.7 investiga. Plano B: render local via HTML+Puppeteer |
| Mudança no layout DPS entre v1.01 e futuras | Baixa (curto prazo) | Alto | Sistema de versionamento no schema → regerar types a cada release oficial |
| Worker crashar pós-submit pré-save | Alta | Alto | Reconciliação via `HEAD /dps/{id}` (Fase 4) |
| Usuário ultrapassar limite MEI silenciosamente | Alta | Alto | Fase 6 implementa alertas + bloqueio acima de 120% |
| Certificado do MEI expirar silenciosamente | Alta | Alto | Job cron verifica `notAfter - 30d` + notifica (Fase 1A) |
| Ambiente de homologação da Receita ter comportamento diferente de produção | Alta | Alto | Smoke test em produção com valor simbólico (Fase 8) |
| Disputa fiscal sobre nota errada emitida | Baixa | Catastrófico | Audit-log em toda emissão; preview obrigatório antes de confirmar; LGPD-compliance no storage |
| LGPD: vazamento de dados fiscais + certificados | Baixa | Catastrófico | Encryption em repouso (já existente); logs sem dados sensíveis; audit-log |

---

## Self-review

**Spec coverage:**
- ✅ Emissão direta sem gateway pago → Fases -1 a 3
- ✅ Cadastro de cliente MEI → Fase 1A
- ✅ Upload seguro de certificado → Fase 1A
- ✅ "Digito dados, ele traz empresa" → Fase 1A (BrasilAPI) + Fase 5 (autocomplete)
- ✅ "Memória de notas emitidas" → Fase 5 (ServicoMemorizado + TomadorFavorito)
- ✅ "Só clicar e às vezes atualizar valor" → Fase 5 (1-clique + form pré-preenchido)
- ✅ "Baixo a nota e mando pra quem eu quiser" → Fase 4 (download XML + PDF)
- ✅ Gratuito pra plataforma → direto na API oficial
- ✅ Regras MEI (limite) → Fase 6
- ✅ Cancelamento e substituição → Fase 7
- ✅ Observabilidade → Fase 8

**Placeholder scan:**
- Fase 3+ têm detalhes em nível de entregáveis + arquivos, não de steps TDD. Isso é intencional (depende de aprendizados do ambiente real) mas está explicitamente marcado.
- Fases -1, 0, 1A, 1B, 2 detalhadas em nível de task.
- Nenhum "TODO" ou "TBD" não marcado.

**Type consistency:**
- Tipos fluem coerentemente: `pfxLoader` → `parsePfx` → `CertInfo` → usado em `prepareSubmission`
- `buildIdDps` input bate com schema XSD (`cLocEmi` 7 dígitos, `CNPJ` 14, `serie` 5, `nDPS` 15)
- `Dps` type alinha com TCDPS do XSD

**Gap check (o que poderia estar faltando):**
- ✅ Testes unitários em todas as fases iniciais
- ✅ Validação XSD offline
- ✅ Validação XMLDSIG offline
- ✅ Reconciliação pós-crash
- ✅ Numeração atômica
- ✅ Catálogo NBS
- ✅ Parâmetros municipais
- ✅ Limite MEI
- ✅ Substituição nativa
- ✅ DANFS-e (com spike pra decidir fonte)
- ✅ Observabilidade
- ✅ Migração pra produção com smoke test
- ⚠️ Multi-idioma / i18n — não escopo (PT-BR only)
- ⚠️ Integração com contador externo — explicitamente fora de escopo

---

## Próximo passo

Plano v2 salvo. Agora inicio execução silenciosa da Fase -1 (spike técnico). Entrego em lote quando o spike completar OU relato imediatamente se travar.
