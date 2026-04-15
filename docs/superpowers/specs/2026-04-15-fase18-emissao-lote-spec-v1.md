# Fase 18 — Emissão em lote de NFS-e via CSV (spec v1)

**Data:** 2026-04-15
**Autor:** Claude (autônomo)
**Objetivo:** Permitir que o usuário emita dezenas/centenas de NFS-e em uma única operação a partir de um CSV, com preview, validação completa, processamento assíncrono via queue, e acompanhamento do progresso em tempo real.

## Contexto
Hoje a emissão é unitária (formulário multi-step em `/nfse/nova`). Clientes MEI/empresas com volume recorrente (ex: aluguel, mensalidades) precisam emitir em lote. Já temos:
- Pipeline de emissão testado (`src/lib/nfse/prepare-submission.ts`, `sefin-client.ts`).
- Queue BullMQ (`nfeQueue`) processando job por NFS-e.
- Padrão de importação CSV (preview + commit) em `tomadores-favoritos.ts`.
- Tomadores favoritos por empresa (podemos resolver nomes/endereços por CPF/CNPJ).
- Numeração DPS sequencial e reservada (`reservarProximoNumeroDps`).

## Escopo

### IN
1. Tela `/nfse/lote` (nova rota protegida) com wizard 3 steps:
   - **Step 1 — Empresa e serviço:** escolher empresa emitente e serviço memorizado OU preencher campos de serviço (código tributação, NBS, local prestação, alíquota ISS, descrição padrão).
   - **Step 2 — Upload CSV:** drop area + paste + template download. Colunas: `documento`, `nome`, `email`, `valor_servico`, `descricao_servico` (opcional — sobrescreve descrição padrão), `data_competencia` (opcional, default hoje). Separador `;` ou `,`. BOM UTF-8 tolerado.
   - **Step 3 — Preview:** tabela com linhas válidas/inválidas/duplicadas (doc repetido), totalizadores (qtd, valor total, ISS total). Checagem MEI (soma do lote + faturamento do ano ≤ R$81k; se ultrapassar, avisar e bloquear). Botão **Enviar lote** cria o lote e dispara enqueue.
2. Modelo `NfseLote` + `NfseLoteItem` no Prisma.
3. Actions: `previewLoteCsv`, `criarLote`, `listarLotes`, `getLoteDetail`, `cancelarLote` (apenas status `pendente`).
4. Processamento: job único do lote orquestra criação de rascunho + enqueue na `nfeQueue` por item; segue a mesma pipeline unitária. Lote não bloqueia resposta HTTP.
5. Página de detalhe `/nfse/lote/[id]`: stats (total, autorizadas, rejeitadas, em andamento, canceladas), barra de progresso, tabela de itens com status por linha, botão **Recarregar**, botão **Reprocessar rejeitadas**, link para cada NFS-e gerada.
6. Listagem `/nfse/lote` (lista de lotes) integrada à navegação (submenu ou botão "Emitir em lote" no topo da lista `/nfse`).
7. Auditoria (`logAudit`) para criação/cancelamento/reprocessamento.
8. Notificação (feed) ao finalizar: "Lote X concluído — Y autorizadas, Z rejeitadas."
9. Rate-limit do lote: máx. 500 itens por lote, máx. 5 lotes simultâneos por empresa.
10. Template CSV estático em `/public/templates/nfse-lote-exemplo.csv`.
11. Exportação CSV de resultados do lote (status + chave + mensagem por linha).

### OUT (fora do escopo)
- Agendamento/recorrência (outra fase).
- API REST v1 endpoint de lote (outra fase — pode usar `/api/v1/empresas/[id]/nfse` chamando N vezes).
- XLSX (só CSV).
- Edição de itens do lote depois de criado (só reprocessar/cancelar).

## Arquitetura

### Modelos Prisma
```prisma
enum NfseLoteStatus {
  pendente       // criado, aguardando itens entrarem na queue
  processando    // pelo menos 1 item em andamento
  concluido      // todos itens em estado terminal (autorizado/rejeitado/cancelado)
  cancelado      // cancelamento solicitado antes do processamento
}

enum NfseLoteItemStatus {
  pendente       // rascunho criado, na queue
  processando
  autorizado
  rejeitado
  cancelado
}

model NfseLote {
  id                 String         @id @default(uuid()) @db.Uuid
  clienteMeiId       String         @map("cliente_mei_id") @db.Uuid
  status             NfseLoteStatus @default(pendente)
  totalItens         Int            @map("total_itens")
  nomeArquivo        String?        @map("nome_arquivo")
  servicoPadrao      Json           @map("servico_padrao") @db.JsonB
  // servicoPadrao contém: codigoTributacaoNacional, codigoNbs, localPrestacaoIbge,
  //                       aliquotaIss, descricaoServico (default)
  createdById        String         @map("created_by") @db.Uuid
  createdAt          DateTime       @default(now()) @map("created_at")
  updatedAt          DateTime       @updatedAt @map("updated_at")
  finalizadoEm       DateTime?      @map("finalizado_em")

  clienteMei ClienteMei      @relation(fields: [clienteMeiId], references: [id], onDelete: Restrict)
  itens      NfseLoteItem[]

  @@index([clienteMeiId, createdAt(sort: Desc)], name: "idx_lote_cliente")
  @@map("nfse_lotes")
}

model NfseLoteItem {
  id             String              @id @default(uuid()) @db.Uuid
  loteId         String              @map("lote_id") @db.Uuid
  nfseId         String?             @unique @map("nfse_id") @db.Uuid
  linhaCsv       Int                 @map("linha_csv")
  status         NfseLoteItemStatus  @default(pendente)
  tomadorDocumento String            @map("tomador_documento")
  tomadorNome      String            @map("tomador_nome")
  tomadorEmail     String?           @map("tomador_email")
  valorServico     Decimal           @map("valor_servico") @db.Decimal(15,2)
  descricaoServico String            @map("descricao_servico") @db.Text
  dataCompetencia  DateTime          @map("data_competencia") @db.Date
  erro             String?           @db.Text
  createdAt        DateTime          @default(now()) @map("created_at")
  updatedAt        DateTime          @updatedAt @map("updated_at")

  lote NfseLote @relation(fields: [loteId], references: [id], onDelete: Cascade)
  nfse Nfse?    @relation(fields: [nfseId], references: [id], onDelete: SetNull)

  @@index([loteId, linhaCsv], name: "idx_lote_item_ordem")
  @@index([status], name: "idx_lote_item_status")
  @@map("nfse_lote_itens")
}
```
(Adicionar relação `lotes NfseLote[]` em `ClienteMei` e `lote NfseLoteItem?` opcional em `Nfse`.)

### Fluxo
1. **Preview (sem persistir):** parse CSV, valida cada linha (CPF/CNPJ, valor > 0, formatação data). Marca duplicados (documento repetido no CSV). Calcula total. Se empresa é MEI, roda `verificarLimiteMei(somaLote + faturamentoAnoAtual)`; se ultrapassar 100%, retorna erro bloqueante. Se faltar certificado A1 válido, erro bloqueante.
2. **Criar lote:** cria `NfseLote` + `NfseLoteItem` por linha válida (ignora inválidas; devolve sumário). Para cada item:
   a. Reserva número DPS (`reservarProximoNumeroDps`).
   b. Cria `Nfse` rascunho (mesma rotina do fluxo unitário).
   c. Liga `NfseLoteItem.nfseId = nfse.id`.
   d. Enfileira job `nfe` com `{ nfseId, clienteMeiId }`.
   e. `logAudit("lote.criado", ...)`.
3. **Worker:** nada muda — já existe worker para `nfeQueue`. Após cada job, o pós-processamento (já existente) atualiza `Nfse.status`. Adicionar um hook após update de status da Nfse: atualizar `NfseLoteItem.status` espelhando. Se após update todos os itens estão em estado terminal, atualizar `NfseLote.status = concluido` + `finalizadoEm` + disparar notificação.
4. **Cancelamento:** só permitido se `NfseLote.status = pendente`. Remove jobs da queue que ainda não rodaram; marca itens como `cancelado`.
5. **Reprocessar rejeitadas:** re-enfileira jobs para itens com status `rejeitado`. Não cria nova Nfse — tenta de novo a pipeline.

### UI (ui-ux-pro-max)
- Seguir padrão shadcn + glow hover do Roteador Webhook.
- Cards de lote em `/nfse/lote` estilo card de empresa: ícone, nome arquivo, stats pills, chevron.
- Detalhe `/nfse/lote/[id]`: header com progresso, 4 stats cards, tabela com busca e filtro status, ações top-right (Reprocessar, Exportar CSV, Cancelar).
- Wizard `/nfse/lote/novo` com 3 steps, mesmo visual do wizard unitário.

### Testes
- Parser CSV: linhas válidas, inválidas, duplicados, BOM, separadores.
- Validação preview: MEI limite, certificado expirado, empresa inativa.
- Criação do lote: cria N itens, reserva numeração única por item.
- Espelhamento de status item→lote quando worker termina.
- Cancelamento: remove jobs, marca itens.

### Observabilidade
- Audit events: `lote.criado`, `lote.cancelado`, `lote.reprocessado`, `lote.concluido`.
- Metrics no dashboard? Fora do escopo — apenas feed de notificação.

## Critérios de sucesso
- Upload de CSV 200 linhas → preview < 2s.
- Criação do lote → itens visíveis em /nfse/lote/[id] com 0 autorizados, N pendentes.
- Em até X minutos, todos processados via queue (depende da SEFIN — fora de controle).
- Exportação CSV final funcional.
- Testes unitários ≥ 90% cobertura das funções novas em `actions/nfse-lote.ts`.

## Riscos
- **Rate limit SEFIN:** muitos jobs simultâneos podem disparar throttling. Mitigação: BullMQ concurrency já é 1 por worker; lotes grandes processam em série naturalmente.
- **Numeração DPS:** reserva sequencial pode virar gargalo em lote grande. Mitigação: reservar tudo de uma vez numa transação ao criar o lote.
- **Memória:** não carregar CSV inteiro se > 5MB. Mitigação: streaming via `csv-parse` em chunks no parse; limite duro 500 itens.
