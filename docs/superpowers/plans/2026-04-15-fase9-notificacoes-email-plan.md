# Plan Final — Fase 9: Notificações por Email

**Spec:** `docs/superpowers/specs/2026-04-15-fase9-notificacoes-email-spec.md`
**Versões:** v1 → review (worker bundle, relative imports) → v2 → review (User.email nullable, dedup) → **final**

## Tasks

### T1 — Schema
- Adicionar `emailNotifications Boolean @default(true) @map("email_notifications")` em `User`.
- Criar migration SQL: `ALTER TABLE users ADD COLUMN email_notifications BOOLEAN NOT NULL DEFAULT TRUE;`
- Aplicar em DB local via docker exec + registrar em `_prisma_migrations`.

### T2 — Módulo `notifications-email.ts`
- Criar `src/lib/notifications-email.ts`.
- Função `sendNotificationEmail(opts)`.
- Template HTML dark minimalista (violet accent #7c3aed, usando APP_CONFIG).
- Verificar `user.emailNotifications` antes de enviar.
- Catch all — nunca propagar erro de email pro caller (log e seguir).

### T3 — Integrar em `check-expiration.ts`
- Após `prisma.notification.create`, chamar `sendNotificationEmail`.
- Import relativo (vai rodar no worker bundle).
- Marcar `channelsSent: { inApp: true, email: true }` quando email enviado.

### T4 — Integrar em `emit-nfse.ts` (rejeição + erro)
- Ao entrar no branch `status: "rejeitada"`:
  - Buscar nfse com include `cliente.createdBy` e `criadoPor`.
  - Criar `Notification` in-app (usar createdBy da NFS-e como recipient).
  - Chamar `sendNotificationEmail`.
- Mesmo tratamento no catch (`status: "erro"`).

### T5 — UI `/profile` — toggle email
- Localizar página de perfil: `src/app/(protected)/profile/**`.
- Adicionar switch/checkbox "Receber notificações por email".
- Server action `updateEmailNotifications(enabled: boolean)` em `src/lib/actions/profile.ts` (ou similar).

### T6 — Testes unitários
- `src/lib/__tests__/notifications-email.test.ts`:
  - opt-out retorna `sent: false`.
  - email sem `user.email` retorna `sent: false`.
  - Happy path chama `sendEmail` com html contendo título + link.
- Mockar `sendEmail`.

### T7 — Build + test
- `npm test` (deve passar 139 existentes + 3 novos).
- `npm run build`.

### T8 — CLAUDE.md + commit + push
- Marcar Fase 9 concluída na seção "Estado atual".
- Commit: `feat(notifications): envio por email para alertas de certificado e NFS-e rejeitada`.
- Push (deploy automático).

## Ordem
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8

## Riscos
- Resend API key ausente em dev: já tratado (modo simulado).
- Worker bundle quebrar por import: usar paths relativos sempre em arquivos importados por `src/worker/**`.
- Email de rejeição spammy: dedup natural pelo status — NFS-e só é rejeitada 1 vez por tentativa.
