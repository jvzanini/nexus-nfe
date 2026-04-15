# Fase 18 — Emissão em lote de NFS-e via CSV (spec final v3)

**Data:** 2026-04-15
**Status:** Final — pronto para plan

## Objetivo
Permitir emissão de N NFS-e (limite configurável, default 500) a partir de um CSV, com preview/validação, processamento assíncrono via queue existente, e acompanhamento em tempo real.

## Rotas novas
- `GET /nfse/lote` — listagem (cards por lote).
- `GET /nfse/lote/novo` — wizard 3 steps.
- `GET /nfse/lote/[id]` — detalhe com polling.
- Botão "Emitir em lote" no header de `/nfse`.

## Models Prisma

```prisma
enum NfseLoteStatus {
  pendente
  processando
  concluido
  cancelado
}

enum NfseLoteItemStatus {
  pendente
  processando
  autorizado
  rejeitado
  erro
  cancelado
}

model NfseLote {
  id            String         @id @default(uuid()) @db.Uuid
  clienteMeiId  String         @map("cliente_mei_id") @db.Uuid
  status        NfseLoteStatus @default(pendente)
  totalItens    Int            @map("total_itens")
  nomeArquivo   String?        @map("nome_arquivo")
  servicoPadrao Json           @map("servico_padrao") @db.JsonB
  createdById   String         @map("created_by") @db.Uuid
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt @map("updated_at")
  finalizadoEm  DateTime?      @map("finalizado_em")

  clienteMei ClienteMei      @relation(fields: [clienteMeiId], references: [id], onDelete: Restrict)
  itens      NfseLoteItem[]

  @@index([clienteMeiId, createdAt(sort: Desc)], name: "idx_lote_cliente")
  @@index([status], name: "idx_lote_status")
  @@map("nfse_lotes")
}

model NfseLoteItem {
  id                 String             @id @default(uuid()) @db.Uuid
  loteId             String             @map("lote_id") @db.Uuid
  nfseId             String?            @unique @map("nfse_id") @db.Uuid
  nfseAnteriorId     String?            @map("nfse_anterior_id") @db.Uuid
  queueJobId         String?            @map("queue_job_id")
  linhaCsv           Int                @map("linha_csv")
  status             NfseLoteItemStatus @default(pendente)
  tomadorDocumento   String             @map("tomador_documento")
  tomadorNome        String             @map("tomador_nome")
  tomadorEmail       String?            @map("tomador_email")
  valorServico       Decimal            @map("valor_servico") @db.Decimal(15,2)
  descricaoServico   String             @map("descricao_servico") @db.Text
  dataCompetencia    DateTime           @map("data_competencia") @db.Date
  erro               String?            @db.Text
  createdAt          DateTime           @default(now()) @map("created_at")
  updatedAt          DateTime           @updatedAt @map("updated_at")

  lote NfseLote @relation(fields: [loteId], references: [id], onDelete: Cascade)
  nfse Nfse?    @relation(fields: [nfseId], references: [id], onDelete: SetNull)

  @@index([loteId, linhaCsv], name: "idx_lote_item_ordem")
  @@index([status], name: "idx_lote_item_status")
  @@map("nfse_lote_itens")
}
```

Relações inversas a adicionar:
- `ClienteMei.lotes NfseLote[]`
- `Nfse.loteItem NfseLoteItem?`

**servicoPadrao JSON shape:**
```ts
{
  codigoTributacaoNacional: string;
  codigoNbs?: string;
  localPrestacaoIbge: string;     // 7 digitos
  aliquotaIss: number;
  descricaoServico: string;       // usado como default por linha
  tributacaoIssqn: number;        // default 1
}
```

## Actions (`src/lib/actions/nfse-lote.ts`)

```ts
previewLoteCsv(clienteMeiId, servicoPadrao, csvText):
  returns {
    totalLinhas, validos[], invalidos[], duplicadosPlanilha,
    totalValor, totalIss, bloqueios[]
  }

criarLote(clienteMeiId, servicoPadrao, csvText, nomeArquivo?):
  returns { loteId }
  // Roda preview, transação cria lote+nfses+itens, enqueue bulk

listarLotes(filtros?: { clienteMeiId?, status?, dataInicio?, dataFim? }):
  returns NfseLoteListItem[]

getLoteDetail(loteId, page = 1):
  returns { lote, stats, itens[], paginacao }

cancelarLote(loteId):
  returns { cancelados: number }
  // só se status=pendente

reprocessarRejeitadas(loteId):
  returns { reprocessados: number }
  // cria novas Nfse (nova numeração), atualiza NfseLoteItem.nfseAnteriorId, re-enfileira

exportarResultadoCsv(loteId):
  returns string (CSV UTF-8 com BOM, separador ;)
```

## Parser CSV

**Colunas obrigatórias:** `documento`, `nome`, `valor_servico`
**Opcionais:** `email`, `descricao_servico`, `data_competencia`

**Autodetect separador:** se linha 1 contém mais `;` que `,` → `;`; senão `,`.
**BOM UTF-8** tolerado.
**Valor:** aceita `100`, `100,50`, `100.50`, `1.234,56` (normaliza).
**Data:** `DD/MM/YYYY` ou `YYYY-MM-DD`. Default = hoje.

**Validações por linha:**
- documento: 11 (CPF válido) ou 14 (CNPJ válido) dígitos.
- nome: >= 2 caracteres, <= 200.
- email: se presente, formato válido.
- valor > 0 e <= 999.999.999,99.
- descricao (ou fallback de servicoPadrao) >= 5 caracteres.
- data_competencia: mês atual ou até 1 mês retroativo.

**Duplicados:** documento repetido no próprio CSV marca a segunda ocorrência como `duplicadosPlanilha` (não vai a válidos).

**Bloqueios globais** (impedem criar lote):
- Empresa inativa.
- Sem certificado A1 ativo (ou expirado).
- Limite MEI ultrapassado: `faturamentoAno + somaLote > R$81.000`.
- > 5 lotes com status ∈ (pendente, processando) para essa empresa.
- `validos.length > getSetting("lote.max_itens", 500)`.
- `servicoPadrao` inválido (zod).

## Fluxo de criação (`criarLote`)

Transação `prisma.$transaction` com timeout 30s:
1. Revalidar preview (bloqueios ainda válidos).
2. Criar `NfseLote` com `totalItens = validos.length`.
3. Para cada item válido (em série dentro da transação):
   a. `reservarProximoNumeroDps(clienteMeiId)` → `{ serie, numero, idDps }`.
   b. Consultar `TomadorFavorito` por documento para herdar endereço (se existir).
   c. Criar `Nfse` rascunho com status `pendente` (pronta para o worker).
   d. Criar `NfseLoteItem` com `nfseId` vinculado.
4. Fora da transação: `nfeQueue.addBulk([...])` com `{ nfseId, clienteMeiId }` por item; capturar `job.id` e atualizar `NfseLoteItem.queueJobId` em um update em massa (`updateMany` por id).
5. Audit `lote.criado` com totais.

**Rollback:** qualquer erro na transação desfaz tudo. Se o enqueue falhar após transação, marcar lote como `erro` e reenfileirar via retry manual (botão).

## Worker — hook no `emit-nfse.ts`

Após cada update de status da NFS-e (autorizada/rejeitada/erro), chamar:
```ts
await atualizarStatusItemLote(prisma, nfseId);
```
Função importada de `@/lib/nfse-lote/status-sync.ts` (ou similar) que:
1. Busca `NfseLoteItem where nfseId = nfseId include lote`.
2. Se não existe, retorna (NFS-e avulsa).
3. Espelha status: autorizada→autorizado, rejeitada→rejeitado, erro→erro.
4. Se TODOS os itens do lote estão em status terminal (autorizado|rejeitado|erro|cancelado), atualiza `NfseLote.status = concluido`, `finalizadoEm = now`, dispara notificação in-app para `createdById`, audit `lote.concluido`.
5. Se era `pendente` e agora há pelo menos 1 em processamento ou terminal, atualiza `NfseLote.status = processando`.

## Cancelamento

`cancelarLote(loteId)`:
- Só se `status = pendente`. Caso contrário erro.
- Para cada item pendente com `queueJobId`: `nfeQueue.getJob(id).remove()` (ignora erros).
- `updateMany` itens pendentes → `cancelado`.
- Atualiza lote → `cancelado`, `finalizadoEm = now`.
- Audit `lote.cancelado`.

## Reprocessar rejeitadas

`reprocessarRejeitadas(loteId)`:
- Filtra itens com status ∈ (rejeitado, erro).
- Para cada um: reserva nova numeração DPS, cria nova Nfse (copia dados do item), seta `item.nfseAnteriorId = nfseAntigo`, `item.nfseId = nova.id`, `item.status = pendente`, `item.erro = null`.
- Enqueue bulk.
- Audit `lote.reprocessado`.
- Lote volta para `processando`.

## UI (ui-ux-pro-max obrigatório, padrão Roteador Webhook)

### `/nfse/lote` — Listagem
- Header: título + botão primário "Novo lote" (violet #7c3aed).
- Filtros CustomSelect: empresa, status, período.
- Grid de cards (1-2-3 colunas responsivo). Cada card:
  - Ícone `FileStack` esquerda.
  - Nome arquivo (ou "Lote sem nome"), razão social da empresa abaixo.
  - Badge status colorido.
  - 3 pills: total / autorizadas / rejeitadas.
  - Chevron direita.
  - Glow hover violet.

### `/nfse/lote/novo` — Wizard
- Barra de steps topo estilo step-confirmar (padrão existente).
- **Step 1 — Empresa e serviço:**
  - CustomSelect empresa (filtra por membership).
  - Toggle "Usar serviço memorizado" → CustomSelect serviços OR inputs manuais.
  - Inputs manuais: NBS selector, código tributação, local prestação IBGE, alíquota ISS, descrição padrão.
- **Step 2 — Upload CSV:**
  - Drop area (drag & drop) + fallback input file.
  - Textarea "colar CSV" (toggle).
  - Botão "Baixar template" → `/templates/nfse-lote-exemplo.csv`.
  - Footer: "X linhas detectadas".
- **Step 3 — Preview:**
  - Tabs: "Válidos (N)", "Inválidos (M)", "Duplicados (K)".
  - Tabela com colunas relevantes por tab.
  - Card resumo: total itens, valor total, ISS total.
  - Alertas bloqueantes em card vermelho (certificado, MEI, rate limit).
  - Botão "Criar lote" (desabilitado se bloqueios ou válidos=0).

### `/nfse/lote/[id]` — Detalhe
- Header: nome arquivo + badge status + timestamps.
- Barra de progresso grande (% concluído).
- 4 stats cards: total, autorizadas, rejeitadas, pendentes.
- Ações top-right: Cancelar (se pendente), Reprocessar rejeitadas (se houver rejeitadas/erro), Exportar CSV.
- Tabela itens com filtro status + busca por documento/nome.
- Polling client-side: `setInterval 5s` enquanto lote.status ∈ (pendente, processando). Limpar on unmount/terminal.
- Links: autorizadas → `/nfse/[id]`; rejeitadas → tooltip com erro.

## Permissões
- `requireEmpresaAccess(clienteMeiId)`:
  - super_admin: sempre permitido.
  - EmpresaMembership com role ∈ (admin, operador): pode criar, cancelar, reprocessar.
  - role = viewer: só listar/visualizar.

## Configuração dinâmica
- `GlobalSettings` key `lote.max_itens`, default 500.
- `GlobalSettings` key `lote.max_simultaneos_empresa`, default 5.

## Template CSV
`public/templates/nfse-lote-exemplo.csv`:
```
documento;nome;email;valor_servico;descricao_servico;data_competencia
12345678901;João da Silva;joao@exemplo.com;150,00;Consultoria técnica;15/04/2026
98765432000199;Empresa LTDA;contato@empresa.com;2.500,50;;15/04/2026
```

## Testes (Vitest)

### Unit — parser
- `parseValorBr("1.234,56")` === 1234.56
- `parseValorBr("100")` === 100
- `parseDataBr("15/04/2026")` === 2026-04-15
- `parseDataBr("2026-04-15")` === 2026-04-15
- Detecção separador `;` vs `,`

### Unit — preview
- CSV válido com 10 linhas → 10 válidos
- CSV com 2 CPF inválidos → 2 invalidos
- CSV com 1 duplicado → count 1
- Bloqueio: empresa sem certificado ativo
- Bloqueio: MEI limite (faturamento 70k + lote 20k)
- Bloqueio: > 500 válidos

### Unit — criarLote
- Transação cria N Nfses + N itens + enfileira N jobs
- Rollback em falha a meio caminho
- nfseAnteriorId preservado em reprocessamento

### Unit — status-sync
- Espelhamento 1-1 status
- Marca lote concluido quando último item terminal
- Notificação disparada 1x no concluido

### Unit — cancel/reprocess
- Cancel falha se já processando
- Reprocess só mexe em rejeitado/erro

## Migrations
`npx prisma migrate dev --name fase18_nfse_lote`
- Criar enums.
- Criar tabelas `nfse_lotes`, `nfse_lote_itens`.
- Relações inversas em `clientes_mei` e `nfses`.

## Deploy
- Migração dev → staging → produção (via entrypoint Prisma migrate deploy).
- Build/push GHCR.
- Atualizar stack no Portainer (automático via workflow).
- Smoke test: criar lote 3 itens em homologação.

## Critérios de sucesso
- Todos 144+N novos testes verdes.
- Lote 200 itens → preview < 2s, criação < 10s.
- UI polling funcional.
- Audit log completo.
- Sem regressão nos fluxos existentes.

## Fora do escopo
- Agendamento/recorrência (próxima fase).
- API REST v1 endpoint de lote (próxima fase).
- XLSX (só CSV).
- Email automático ao tomador é herdado do fluxo unitário sem mudança.
