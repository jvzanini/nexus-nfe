# Spec Final — Fase 9: Notificações por Email

**Data:** 2026-04-15
**Versões:** v1 → review (escopo amplo demais) → v2 → review (templates HTML, idempotência, prefs por usuário) → **final**

## Objetivo
Levar notificações que hoje são apenas in-app (badge no sininho) também para email — sem perder dedup nem permitir spam.

## Escopo

### 9.1 — Email para alertas de certificado
- Onde: `src/lib/certificates/check-expiration.ts` já cria notificação in-app diariamente. Adicionar envio de email para `clienteMei.createdById.email`.
- Marcar `channelsSent.email = true` na notif criada.
- Templates: dois (expirando, expirado) — visual consistente com email de password reset (dark, violet).

### 9.2 — Email imediato para NFS-e rejeitada/erro
- Onde: `src/worker/handlers/emit-nfse.ts` ao setar `status: "rejeitada"` ou `status: "erro"`.
- Criar `Notification` in-app + enviar email para `nfse.createdById.email` (ou `clienteMei.createdById.email` se o usuário criador não tiver email).
- Template com: número/série, tomador, código de resposta SEFIN, mensagem, link `/nfse/{id}`.
- Dedup: 1 email por NFS-e por status (status muda raramente).

### 9.3 — Preferências do usuário (opt-out)
- Schema `User`: adicionar `emailNotifications Boolean @default(true)`.
- UI: checkbox em `/profile` "Receber notificações por email".
- Validar antes de enviar: `if (user.emailNotifications === false) skip`.

### Fora de escopo (deferido para Fase 10)
- Resumo diário consolidado.
- Configuração granular (escolher tipos).
- Webhooks externos.

## Detalhes técnicos

### Novo módulo `src/lib/notifications-email.ts`
```ts
export async function sendNotificationEmail(opts: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string; // path interno, ex: /clientes/abc
}): Promise<{ sent: boolean; reason?: string }>
```
Responsabilidades:
1. Buscar `user` (email + emailNotifications).
2. Se `!user.email` ou `emailNotifications=false` → `{ sent: false, reason: "opted_out" }`.
3. Renderizar HTML genérico (header com logo Nexus, badge de tipo, título, mensagem, CTA "Ver detalhes" → `https://${domain}${link}`).
4. Chamar `sendEmail()`.

### Imports relativos no worker
`src/worker/handlers/emit-nfse.ts` e `src/lib/certificates/check-expiration.ts` rodam no worker bundle (esbuild). Deve usar paths relativos. `notifications-email.ts` deve ser importável tanto pelo Next quanto pelo worker — colocar em `src/lib/` mas usar import relativo dentro do worker.

### Schema
```prisma
model User {
  // ...
  emailNotifications Boolean @default(true) @map("email_notifications")
}
```

### Atualizações em código existente
- `check-expiration.ts`: depois de `prisma.notification.create`, chamar `sendNotificationEmail(...)` com mesmo título/mensagem/link.
- `emit-nfse.ts`: ao rejeitar/errar, criar notification + email.

## Critérios de aceitação
- `npm run build` verde.
- `npm test` 139/139 (sem regressão).
- Schema migrado em prod via container entrypoint.
- Email sai (verificável via Resend dashboard) quando NFS-e rejeitada e quando cert expira (smoke test em homologação).
- Toggle em `/profile` desativa envio.
