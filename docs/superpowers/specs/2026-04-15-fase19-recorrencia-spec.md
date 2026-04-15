# Fase 19 — Agendamento e Recorrência de NFS-e (spec final)

**Data:** 2026-04-15
**Status:** Final (v3 após 2 reviews)

## Objetivo
Permitir agendar emissão automática de NFS-e para um tomador, de forma pontual (data futura) ou recorrente (mensal/anual), usando template de serviço fixo + valor. Ideal para aluguéis, mensalidades, contratos recorrentes.

## Escopo IN

### Rotas novas
- `/nfse/agendamentos` — listagem + kanban por empresa.
- `/nfse/agendamentos/novo` — form de criação.
- `/nfse/agendamentos/[id]` — detalhe + histórico de emissões geradas + edição.

### Models Prisma

```prisma
enum AgendamentoStatus {
  ativo
  pausado
  encerrado
}

enum AgendamentoFrequencia {
  unica          // data única, dispara 1x
  mensal
  bimestral
  trimestral
  semestral
  anual
}

model NfseAgendamento {
  id                String                @id @default(uuid()) @db.Uuid
  clienteMeiId      String                @map("cliente_mei_id") @db.Uuid
  status            AgendamentoStatus     @default(ativo)
  frequencia        AgendamentoFrequencia
  nome              String                // descrição curta do agendamento
  proximaExecucao   DateTime              @map("proxima_execucao")
  diaMes            Int?                  @map("dia_mes")   // 1-28 para mensal+
  dataFinal         DateTime?             @map("data_final") @db.Date
  totalExecucoes    Int                   @default(0) @map("total_execucoes")
  maxExecucoes      Int?                  @map("max_execucoes")

  // Template de emissão
  codigoTributacaoNacional String
  codigoNbs                String?
  localPrestacaoIbge       String
  aliquotaIss              Decimal @db.Decimal(5,2)
  descricaoServico         String  @db.Text
  valorServico             Decimal @db.Decimal(15,2)
  tributacaoIssqn          Int     @default(1)

  // Tomador
  tomadorTipo      String
  tomadorDocumento String
  tomadorNome      String
  tomadorEmail     String?
  tomadorEndereco  Json?   @db.JsonB

  createdById String   @map("created_by") @db.Uuid
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  lastRunAt   DateTime? @map("last_run_at")
  lastError   String?   @map("last_error") @db.Text

  clienteMei ClienteMei @relation(fields: [clienteMeiId], references: [id], onDelete: Cascade)
  execucoes  NfseAgendamentoExecucao[]

  @@index([status, proximaExecucao], name: "idx_agendamento_proxima")
  @@index([clienteMeiId, createdAt(sort: Desc)], name: "idx_agendamento_cliente")
  @@map("nfse_agendamentos")
}

model NfseAgendamentoExecucao {
  id             String   @id @default(uuid()) @db.Uuid
  agendamentoId  String   @map("agendamento_id") @db.Uuid
  nfseId         String?  @map("nfse_id") @db.Uuid
  executadoEm    DateTime @default(now()) @map("executado_em")
  sucesso        Boolean  @default(false)
  erro           String?  @db.Text

  agendamento NfseAgendamento @relation(fields: [agendamentoId], references: [id], onDelete: Cascade)

  @@index([agendamentoId, executadoEm(sort: Desc)], name: "idx_execucao_agendamento")
  @@map("nfse_agendamento_execucoes")
}
```

Relação inversa em `ClienteMei`: `agendamentos NfseAgendamento[]`.

### Scheduler
BullMQ suporta `repeat` mas preferimos lógica explícita em banco para auditabilidade:
- Job BullMQ `agendamento-tick` disparado pelo `Queue.repeat` de 5 em 5 minutos.
- Handler pega agendamentos com `status=ativo AND proximaExecucao <= now`, processa cada um:
  1. Cria NFS-e rascunho → enfileira na `nfeQueue` (mesmo pipeline unitário).
  2. Cria `NfseAgendamentoExecucao` com `nfseId`.
  3. Calcula `proximaExecucao` conforme `frequencia` (mensal = +1 mês no `diaMes`; bimestral = +2; etc). Se `dataFinal` passou ou `totalExecucoes >= maxExecucoes`, marca `encerrado`.
  4. Incrementa `totalExecucoes`.

Fallback seguro: se container do worker estiver fora, agendamentos atrasados são executados no próximo tick (catch-up).

### Actions (`src/lib/actions/nfse-agendamentos.ts`)
- `criarAgendamento(input)` — valida + cria.
- `listarAgendamentos(filtros?)`.
- `getAgendamento(id)` — com histórico.
- `pausarAgendamento(id)`.
- `retomarAgendamento(id)`.
- `encerrarAgendamento(id)`.
- `atualizarAgendamento(id, input)` — só campos de template e próxima execução.
- `executarAgoraAgendamento(id)` — dispara manualmente 1x (não altera próxima execução agendada).

### Scheduler setup
- Adicionar em `src/worker/index.ts` o job recorrente.
- Novo handler `src/worker/handlers/agendamento-tick.ts`.
- Utilidade `src/lib/nfse-agendamentos/proxima-execucao.ts` pura, testável.

### UI (ui-ux-pro-max, padrão Roteador)
- `/nfse/agendamentos` — cards (ícone Calendar, nome, próxima execução, frequência, badge status, chevron).
- `/nfse/agendamentos/novo` — form wizard simples (empresa → tomador → template serviço → cronograma).
- `/nfse/agendamentos/[id]` — header + stats (total emitidas, próxima execução, última execução) + histórico tabela + ações (Pausar/Retomar/Encerrar/Executar agora/Editar).
- Botão "Agendar" no header de `/nfse` ao lado de "Emitir em lote".

### Permissões
- `requireRole("admin")`.

### Testes
- `calcularProximaExecucao(base, freq, diaMes)` — unit puro:
  - mensal 31/01 → próxima 28/02 (dia inválido → último dia).
  - bimestral 15/03 → 15/05.
  - anual 2026-04-15 → 2027-04-15.
- Action `criarAgendamento` — mock prisma.
- Action `executarAgoraAgendamento` — cria NFS-e e execução.
- Handler `agendamento-tick` — processa 2 agendamentos atrasados e atualiza `proximaExecucao`.
- Encerra quando atinge `dataFinal` ou `maxExecucoes`.

### Migrations
`20260415040000_fase19_agendamentos/migration.sql` — 2 enums + 2 models.

### Observabilidade
- Audit: `agendamento.criado`, `.pausado`, `.retomado`, `.encerrado`, `.executado_auto`, `.executado_manual`.
- Logger estruturado no tick.

## Escopo OUT
- Edição de execuções individuais retroativas.
- Recorrência customizada (cron).
- API REST v1 de agendamentos (próxima fase).
- Simulação/preview de próximas N execuções.

## Critérios
- Agendamento mensal criado hoje executa automaticamente daqui a 5 min (se `proximaExecucao = now`).
- Pausar impede execução; retomar reativa sem pular datas passadas.
- Histórico sempre auditável.
- Testes ≥ 95% no `proxima-execucao.ts`.
