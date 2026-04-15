# Plan Final — Fase 1: Pendências UI

**Data:** 2026-04-15
**Spec:** `docs/superpowers/specs/2026-04-15-pendencias-ui-fase1-spec.md`
**Versões:** v1 → review (lacunas em migration SQL/tipos derivados) → v2 → review 2 (ordenação de tasks, risco de regressão no dialog) → **final (esta)**

## Sequência de tasks

### T1 — Prisma: adicionar `logoUrl` em `ClienteMei`
- Editar `prisma/schema.prisma` (após `nomeFantasia`): `logoUrl String? @map("logo_url")`.
- Rodar `npx prisma migrate dev --name add_logo_url_to_clientes_mei`.
- Rodar `npx prisma generate`.
- Verificar que `prisma/migrations/*/migration.sql` contém `ADD COLUMN "logo_url" TEXT`.

### T2 — Validação Zod: `logoUrl` opcional
- Editar `src/lib/validation/cliente-mei.ts`.
- Adicionar `logoUrl` no `createClienteMeiSchema` com `.url()` + `.optional()` + tolerância a string vazia.
- Update schema herda via `.partial()`.

### T3 — Actions `clientes-mei.ts`
- Adicionar `logoUrl: string | null` em `ClienteMeiListItem` (linha 14-29) e `ClienteMeiDetail` (linha 31-41).
- Incluir `logoUrl` no mapper de `listClientesMei` (linha 88-106).
- Incluir `logoUrl` no mapper de `getClienteMei` (linha 142-168).
- `createClienteMei` e `updateClienteMei` já funcionam via spread (`...data`).

### T4 — API REST v1
- `src/app/api/v1/empresas/route.ts` GET: adicionar `logoUrl: true` no `select` e `logoUrl: c.logoUrl` no mapper.
- `src/app/api/v1/empresas/[id]/route.ts` GET/PUT: mesmo tratamento.
- POST: aceita logoUrl automaticamente (valida via schema Zod).

### T5 — Dialog de edição (`edit-empresa-dialog.tsx`)
- Adicionar input `Logo URL (opcional)` antes do separador "Desativar/Excluir".
- Tipo `url`, placeholder `https://...`.
- Controlled via state existente do form.

### T6 — Dialog Nova Empresa (localizar e atualizar)
- Encontrar form inline em `clientes-content.tsx` (`grep -n "razaoSocial" src/app/(protected)/clientes/clientes-content.tsx`).
- Adicionar mesmo campo Logo URL na seção de dados opcionais.

### T7 — Card listagem (`clientes-content.tsx`)
- Encontrar bloco `w-11 h-11 rounded-xl bg-muted` (linha ~229-231).
- Substituir por renderização condicional: `<img>` com `onError` marcando `brokenLogoIds` → fallback Building2.
- Adicionar `useState<Set<string>>` no topo do componente para trackar logos quebrados.
- Incluir `logoUrl` no tipo usado pela listagem (já vem das actions).

### T8 — Header detalhe (`empresa-header.tsx`)
- Trocar tamanho `w-12 h-12 sm:w-14 sm:h-14` → `w-14 h-14` fixo.
- Ícone `w-6 h-6 sm:w-7 sm:h-7` → `w-7 h-7` fixo.
- Envolver em condicional `empresa.logoUrl && !imgBroken` com `<img>` + fallback.
- `useState imgBroken` local.

### T9 — Tab Tomadores: filtro 3 recentes
- Editar `src/app/(protected)/clientes/[id]/_components/tab-tomadores.tsx`.
- Importar `CustomSelect` (verificar path de import — `src/components/ui/custom-select.tsx`).
- Importar `useMemo` se ainda não.
- Computar `tomadoresRecentesIds` (sort por `ultimoUso` desc, top 3).
- Adicionar `filterTomadorId` state.
- Renderizar `<CustomSelect>` acima da tabela (lado a lado do input de busca).
- Options: `[{ value: "", label: "Todos os tomadores" }, ...tomadores.map(...)]`.
- Aplicar filtro na lista renderizada (`.filter((t) => !filterTomadorId || t.id === filterTomadorId)`).

### T10 — Documentação `/api-docs`
- Atualizar exemplos das rotas `GET /empresas` e `POST /empresas` incluindo `logoUrl` no body/resposta.
- Arquivo provável: `src/app/(protected)/api-docs/**/page.tsx` ou config de endpoints.

### T11 — Atualizar CLAUDE.md
- Marcar "Ícone da empresa..." como ✅ concluído.
- Marcar "Tab Tomadores: filtro de busca com 3 recentes" como ✅ concluído.

### T12 — Verificação
- `npm run build` (executar).
- `npm test` (139/139).
- `npx tsc --noEmit` se separado.

### T13 — Commit + deploy
- Commit único em português: `feat(ui): suporte a logo da empresa e filtro de tomadores recentes`.
- Push `main` → trigger GitHub Actions → Portainer deploy automático.

### T14 — Memória e docs
- Atualizar `memory/MEMORY.md` se novo aprendizado surgir.
- Atualizar CLAUDE.md seção "Estado atual" consolidando Fase 1 concluída.

## Ordem de execução

T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12 → T13 → T14

T12 só progride se build/tests passarem. Se falhar, corrigir in-place (não rollback).

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Migration falhar em produção | Nullable + zero-downtime; rollback via `prisma migrate resolve` |
| URL de logo quebrada no frontend | `onError` → fallback Building2 |
| Tipo do `empresa` em contextos que não foram atualizados | TypeScript build pega; fix direto |
| Regressão no dialog edição | Campo novo é puramente aditivo |
