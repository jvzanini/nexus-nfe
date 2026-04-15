# Spec v1 — Fase 1: Pendências UI

**Data:** 2026-04-15
**Escopo:** Fechar as duas últimas pendências de UI em `CLAUDE.md`:
1. Ícone da empresa no card/detalhe: espelhar 1:1 o Roteador (suporte a `logoUrl` com fallback Building2).
2. Tab Tomadores: filtro de busca com 3 recentes (padrão idêntico ao `tab-notas.tsx`).

## 1. Ícone da empresa (card + header)

### Estado atual
- `src/app/(protected)/clientes/clientes-content.tsx:229-231` — usa `<div w-11 h-11 rounded-xl bg-muted border border-border/50 …><Building2/></div>`, sem suporte a logo.
- `src/app/(protected)/clientes/[id]/_components/empresa-header.tsx:37-39` — usa `w-12 h-12 sm:w-14 sm:h-14`, sem suporte a logo.

### Referência (Roteador)
- `company-card.tsx:53-63` e `company-header.tsx:42-51` — `img` condicional com fallback Building2. Tamanhos: card `w-11 h-11`/`w-5 h-5`; header `w-14 h-14`/`w-7 h-7`.

### Mudanças
1. **Schema Prisma:** adicionar `logoUrl String? @map("logo_url")` ao model `ClienteMei`. Migration incremental.
2. **Actions (`src/lib/actions/clientes-mei.ts`):**
   - `createClienteMei` / `updateClienteMei`: aceitar `logoUrl?: string`.
3. **Dialogs:**
   - `EditEmpresaDialog` (+ Novo Empresa se aplicável): campo "Logo URL (opcional)".
4. **Card listagem (`clientes-content.tsx`):** wrapper condicional — se `empresa.logoUrl`, renderiza `<img className="w-11 h-11 rounded-xl object-cover ring-1 ring-border/50" />`; senão fallback Building2 igual ao atual.
5. **Header detalhe (`empresa-header.tsx`):** normalizar para `w-14 h-14` (remover breakpoint sm), ícone `w-7 h-7`. Condicional de logo igual ao card mas com `border border-border` no `<img>`.
6. **Type/interface:** propagar `logoUrl?: string | null` em `ClienteMeiListItem`, `ClienteMeiDetail` (ou equivalentes usados nas páginas).

### Fora de escopo
- Upload de logo em storage. Apenas URL. Upload entra em fase futura.

## 2. Tab Tomadores — filtro de busca com 3 recentes

### Estado atual
`tab-tomadores.tsx` tem `search` state filtrando por nome/documento, mas sem:
- CustomSelect com "3 recentes".
- Destaque visual de tomadores recentes.

### Referência interna do próprio projeto
`tab-notas.tsx:161-168` já implementa o cálculo de recentes e usa `CustomSelect` com `description: "Recente"`.

### Mudanças
1. Adicionar `CustomSelect` acima da tabela de tomadores, alinhado à esquerda do botão "+ Novo Tomador".
2. Options:
   - `{ value: "", label: "Todos os tomadores" }`
   - Para cada tomador: `{ value: tomador.id, label: tomador.nome, description: top3Ids.includes(id) ? "Recente" : undefined }`.
3. Cálculo de recentes: sort por `ultimoUso` desc (campo já existe no schema), top 3. Se dois ou mais com `ultimoUso` null, cair para `createdAt`.
4. Estado `filterTomadorId` aplicado antes do filtro de texto.
5. Input de busca permanece; CustomSelect é complementar.
6. Contagem no header já existe; manter.

### Fora de escopo
- Agrupamento por grupo empresarial (já implementado em outra sessão).

## Impacto/Riscos
- Migration adiciona coluna nullable — zero downtime.
- Se `logoUrl` vier inválida, imagem quebra. Mitigação: `onError` no `<img>` caindo para fallback Building2 via estado local.
- Sem impacto em testes existentes de NFS-e (139 testes continuam verdes).

## Critérios de sucesso
- `npm run build` verde.
- `npm test` com 139/139 passando.
- Navegação visual em dev: card da empresa, header detalhe, e tab Tomadores renderizam conforme Roteador.
- CLAUDE.md atualizado marcando as duas pendências como concluídas.
