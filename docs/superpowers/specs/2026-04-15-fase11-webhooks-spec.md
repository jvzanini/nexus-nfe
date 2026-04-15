# Spec Final — Fase 11: Webhooks Outbound

**Data:** 2026-04-15
**Iterações:** v1 → review (dedup via outbox, HMAC, retry) → v2 → review (isolamento por empresa, rotação de secret) → final

## Objetivo
Permitir que cada empresa configure URLs externas que recebem eventos de ciclo de vida da NFS-e (autorizada, rejeitada, cancelada). Entrega confiável via outbox + BullMQ com retry exponencial e assinatura HMAC-SHA256.

## Escopo

### 11.1 Model
```prisma
model WebhookEndpoint {
  id           String   @id @default(uuid()) @db.Uuid
  clienteMeiId String   @map("cliente_mei_id") @db.Uuid
  url          String
  secret       String   // gerado aleatório 32 bytes hex
  events       String[] // ["nfse.autorizada","nfse.rejeitada","nfse.cancelada"]
  isActive     Boolean  @default(true) @map("is_active")
  lastStatus   String?  @map("last_status") // "success" | "error"
  lastAttemptAt DateTime? @map("last_attempt_at")
  failureCount Int      @default(0) @map("failure_count")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  createdById  String   @map("created_by") @db.Uuid

  clienteMei ClienteMei @relation(fields: [clienteMeiId], references: [id], onDelete: Cascade)

  @@index([clienteMeiId])
  @@map("webhook_endpoints")
}
```
+ `webhookEndpoints WebhookEndpoint[]` em `ClienteMei`.

### 11.2 Emissão de eventos
Na transição de status da NFS-e, gravar `OutboxEvent`:
- `nfse.autorizada` quando handler marca `autorizada`.
- `nfse.rejeitada` quando marca `rejeitada` ou `erro`.
- `nfse.cancelada` quando server action `cancelarNfse` marca `cancelada`.

Payload: `{ event, nfseId, clienteMeiId, status, chaveAcesso, numeroNfse, serie, numero, valorServico, tomadorNome, occurredAt }`.

### 11.3 Worker outbox
Estender `outboxWorker` em `src/worker/index.ts`:
1. Buscar event.
2. Parsear `payload.clienteMeiId` → listar `WebhookEndpoint` ativos da empresa cujo `events` inclui `payload.event`.
3. Para cada endpoint: HTTP POST com body JSON + headers:
   - `X-Nexus-Event: <event>`
   - `X-Nexus-Signature: sha256=<hmac>`
   - `X-Nexus-Delivery: <uuid>`
4. Timeout 10s.
5. Atualizar `lastStatus`, `lastAttemptAt`, `failureCount` no endpoint.
6. Se algum endpoint falhar → throw (BullMQ reagenda com backoff). Outbox só marca published se todos OK.

**Simplificação:** para MVP, marcar event como published mesmo se parcialmente falhou, registrando falhas em `lastStatus`. Retry fica a cargo do operador (botão "reenviar").

### 11.4 Actions (`src/lib/actions/webhooks.ts`)
- `listarWebhooks(clienteMeiId)`
- `criarWebhook(input)` — gera `secret` aleatório.
- `atualizarWebhook(id, input)`
- `excluirWebhook(id)`
- `rotacionarSecret(id)`
- RBAC: admin+.

### 11.5 UI
Nova tab "Webhooks" em `/clientes/[id]/_components/tab-webhooks.tsx` (entre Tomadores e Notas ou após Membros).
- Lista com URL mascarada, badge de status, eventos, botão editar/excluir.
- Dialog novo webhook: URL, checkboxes eventos, copiar secret (gerado).
- Rotação de secret.

### 11.6 Segurança
- `secret` mostrado UMA vez na criação (toast + copy button); depois só rotacionar.
- Armazenado em plain-text no DB (já é random high-entropy por webhook — basta proteger o DB).
- HMAC: `crypto.createHmac("sha256", secret).update(body).digest("hex")`.

## Critérios de aceitação
- Build + testes verdes.
- Ao autorizar NFS-e em dev, endpoint cadastrado recebe POST com header `X-Nexus-Signature`.
- Tab Webhooks funcional com CRUD.
