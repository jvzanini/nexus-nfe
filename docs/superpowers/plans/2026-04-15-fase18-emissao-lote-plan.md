# Fase 18 — Emissão em lote: Plano de implementação (final v3)

Baseado em `docs/superpowers/specs/2026-04-15-fase18-emissao-lote-spec.md`.

## Ordem de execução

### Bloco 1 — Schema e fundações
**T1.** Atualizar `prisma/schema.prisma`:
- Adicionar enums `NfseLoteStatus`, `NfseLoteItemStatus`.
- Adicionar models `NfseLote` e `NfseLoteItem` (conforme spec).
- Adicionar `lotes NfseLote[]` em `ClienteMei`.
- Adicionar `loteItem NfseLoteItem?` em `Nfse`.

**T2.** Rodar `npx prisma migrate dev --name fase18_nfse_lote` + regenerar client.

**T3.** Criar `src/lib/nfse-lote/settings.ts`:
- `getMaxItensLote()` lê `GlobalSettings` key `lote.max_itens`, default 500.
- `getMaxLotesSimultaneos()` lê `lote.max_simultaneos_empresa`, default 5.

### Bloco 2 — Parser CSV e validação
**T4.** Criar `src/lib/nfse-lote/csv-parser.ts`:
- `detectSeparator(firstLine)`.
- `parseCsvLine(line, sep)` (tolera aspas).
- `parseValorBr(s)`.
- `parseDataBr(s)` com fallback ISO.
- `normalizeHeader(s)`.
- Testes unit em `__tests__/csv-parser.test.ts`.

**T5.** Criar `src/lib/validation/nfse-lote.ts` (zod):
- `servicoPadraoSchema`.
- `itemLoteSchema` (por linha).
- Testes.

**T6.** Criar `src/lib/nfse-lote/preview.ts`:
- `previewLoteCsvCore(empresa, servicoPadrao, csvText, settings)` puro (testável).
- Retorna `{ validos, invalidos, duplicadosPlanilha, totalValor, totalIss, bloqueios }`.
- Testes cobrindo: válidos, invalidos, duplicados, separadores, valor BR, data BR, descrição fallback, bloqueios.

### Bloco 3 — Actions
**T7.** Criar `src/lib/actions/nfse-lote.ts`:
- `requireEmpresaAccess(clienteMeiId)` helper compartilhado (ou reutiliza `empresa-memberships`).
- `previewLoteCsv(input)` server action — carrega empresa, certificado, faturamento, count de lotes simultâneos, chama core.
- `criarLote(input)` server action — revalida preview + `prisma.$transaction([...], { timeout: 30_000 })`:
  - cria NfseLote.
  - loop: reserva num DPS, consulta TomadorFavorito p/ endereço, cria Nfse rascunho (status=pendente) + NfseLoteItem vinculado.
  - retorna lote+itens com `nfseId`.
  - Fora da transação: `nfeQueue.addBulk(...)` → `updateMany` queueJobId por itemId.
  - `logAudit("lote.criado", { loteId, totalItens, totalValor })`.
- `listarLotes(filtros)`.
- `getLoteDetail(loteId, page)`.
- `cancelarLote(loteId)`.
- `reprocessarRejeitadas(loteId)`.
- `exportarResultadoCsv(loteId)`.
- Testes cobrindo cada função (mock Prisma + mock queue).

### Bloco 4 — Worker hook
**T8.** Criar `src/lib/nfse-lote/status-sync.ts`:
- `atualizarStatusItemLote(prisma, nfseId, novoStatus)`.
- Lógica espelhamento + detecção de conclusão + notificação + audit.
- Testes.

**T9.** Atualizar `src/worker/handlers/emit-nfse.ts`:
- Após cada `prisma.nfse.update` (autorizada, rejeitada, erro): chamar `atualizarStatusItemLote(prisma, nfseId, status)`.
- Garantir import relativo correto (worker usa `../../lib/...`).

### Bloco 5 — UI
**T10.** Acessibilidade da nova feature:
- NÃO adicionar item novo no sidebar (navegação já está enxuta). Acesso via botão secundário "Emitir em lote" no header da página `/nfse`.
- Adicionar card de stats no `/nfse/page.tsx` (ou link) apontando para `/nfse/lote`.
- `isActive("/nfse")` no sidebar deve continuar destacando quando estiver em `/nfse/lote/*` (já funciona pois usa startsWith).

**T11.** Criar `src/app/(protected)/nfse/lote/page.tsx`:
- Fetch `listarLotes()`.
- Render grid de cards estilo Roteador.
- Filtros (CustomSelect empresa, status, período).

**T12.** Criar `src/app/(protected)/nfse/lote/novo/page.tsx` + `_components/wizard-lote.tsx`:
- Step 1 — empresa + serviço (reutiliza `NbsSelector` existente + CustomSelect servicos memorizados).
- Step 2 — drop/textarea/template download.
- Step 3 — preview (tabs, tabelas, card resumo, alertas bloqueio).
- Client component; action chamadas via `use server`.

**T13.** Criar `src/app/(protected)/nfse/lote/[id]/page.tsx` + `_components/lote-detail.tsx`:
- Server component carrega detalhe inicial.
- Client component faz polling enquanto status ∈ (pendente, processando).
- Ações: Cancelar, Reprocessar, Exportar.

**T14.** Criar `public/templates/nfse-lote-exemplo.csv`.

**T15.** Adicionar página/rota ao menu de busca global (⌘K) — opcional (se houver patrão já).

### Bloco 6 — Testes finais e docs
**T16.** Rodar `npm test` — garantir 0 falhas.

**T17.** Atualizar `CLAUDE.md`:
- Adicionar Fase 18 concluída na seção "Fases de implementação".
- Adicionar módulo `nfse-lote` na lista de Actions.

**T18.** Atualizar `docs/api/README.md` se tocar API (não toca nesta fase).

**T19.** Commit + push → deploy automático via Portainer.

**T20.** Smoke test em homologação: criar lote 3 itens, validar status final.

**T21.** Atualizar memória persistente se algo não-óbvio apareceu.

## Blocos paralelos
- T4, T5 independentes → paralelo.
- T11, T12, T13 podem ser feitos em paralelo após T7.

## Checkpoints
- Após T2: schema compila, client regenerado.
- Após T7: todos os testes de actions verdes.
- Após T9: pipeline end-to-end testável em homolog.
- Após T13: UI completa.
- Após T16: tudo verde, pronto para deploy.

## Riscos/Bloqueios potenciais
- Prisma migrate em produção pode exigir zero-downtime: os models novos não tocam existentes, só adicionam — seguro.
- Worker precisa rebuild de container separado? Sim — mas mesmo workflow atualiza ambos (`nexus-nfe_app` e `nexus-nfe_worker` usam a mesma imagem GHCR).
- Polling 5s com 500 itens renderiza tabela pesada — limitar paginação 100/pág client-side.

## Notas de review consolidadas
- **T7 Audit:** usar `logAudit` de `src/lib/audit-log.ts` (assinatura atual, sem inventar helper novo).
- **T9 Worker imports:** worker usa paths relativos (`../../lib/...`); status-sync deve estar em `src/lib/nfse-lote/status-sync.ts` e ser importado como `../../lib/nfse-lote/status-sync`.
- **T7 listarLotes:** respeitar membership — super_admin vê tudo; demais roles só empresas nas quais têm membership.
- **T11 paginação:** server action `listarLotes` retorna os 50 mais recentes por default; filtros aplicam-se antes do limite.
- **T13 polling client:** usar `useEffect` + `fetch` via action wrapper OR `router.refresh()` — escolhi `router.refresh()` (server action re-executa server component) quando status não-terminal; cancelar interval ao desmontar.
- **T7 reprocessar:** ao criar nova Nfse no reprocessamento, garantir que a antiga vai pra `loteItem null` (o `unique nfseId` garante isso via update atômico).
- **T5 validação:** `servicoPadraoSchema` deve coerenciar `aliquotaIss` 0-5 (limite típico MEI/ISSQN) — usar 0-100 como no formulário unitário para consistência.
- **T14 template:** garantir BOM UTF-8 no arquivo (Excel BR precisa).
- **T16 testes:** rodar `npm test -- --run` para modo CI; esperar ≥ 170 testes no total.
- **Segurança:** `previewLoteCsv` e `criarLote` não devem retornar segredos; payload audit omite `csvText` completo (só totais).
- **Performance:** `previewLoteCsv` valida tudo em memória — OK até 500 linhas. Se subir limite, considerar stream.
- **UX:** indicação clara no wizard de que números DPS serão consumidos imediatamente ao criar lote (não no enqueue).
