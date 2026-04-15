// Envio de notificações por email — usado por:
//  - Cron de expiração de certificado (src/lib/certificates/check-expiration.ts)
//  - Handler de emissão de NFS-e (src/worker/handlers/emit-nfse.ts)
//
// Importante: este arquivo é importado tanto pelo Next quanto pelo
// worker bundle. Consumidores no worker devem usar path relativo.

import { prisma } from "./prisma";
import { sendEmail } from "./email";
import { APP_CONFIG } from "./app.config";

export type NotificationEmailType = "error" | "warning" | "info";

export interface SendNotificationEmailInput {
  userId: string;
  type: NotificationEmailType;
  title: string;
  message: string;
  link: string; // path interno, ex: /clientes/abc
}

const TYPE_CONFIG: Record<
  NotificationEmailType,
  { badge: string; color: string; bg: string; border: string }
> = {
  error: {
    badge: "Atenção imediata",
    color: "#fca5a5",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.3)",
  },
  warning: {
    badge: "Alerta",
    color: "#fcd34d",
    bg: "rgba(234,179,8,0.1)",
    border: "rgba(234,179,8,0.3)",
  },
  info: {
    badge: "Informação",
    color: "#c4b5fd",
    bg: "rgba(124,58,237,0.1)",
    border: "rgba(124,58,237,0.3)",
  },
};

function renderHtml(input: SendNotificationEmailInput): string {
  const cfg = TYPE_CONFIG[input.type];
  const url = `https://${APP_CONFIG.domain}${input.link}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head><meta charset="utf-8" /><title>${input.title}</title></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #f5f5f5; padding: 32px;">
    <div style="max-width: 560px; margin: 0 auto; background: #141414; border: 1px solid #262626; border-radius: 12px; padding: 32px;">
      <h1 style="margin: 0 0 8px; font-size: 20px; color: #a78bfa;">${APP_CONFIG.name}</h1>
      <div style="display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; color: ${cfg.color}; background: ${cfg.bg}; border: 1px solid ${cfg.border}; margin: 12px 0;">
        ${cfg.badge}
      </div>
      <h2 style="margin: 8px 0 12px; font-size: 18px; color: #fafafa;">${input.title}</h2>
      <p style="color: #a3a3a3; line-height: 1.6; margin: 0 0 24px;">${input.message}</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${url}" style="display: inline-block; background: #7c3aed; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
          Ver detalhes
        </a>
      </div>
      <p style="color: #525252; font-size: 12px; line-height: 1.6; margin-top: 24px; border-top: 1px solid #262626; padding-top: 16px;">
        Você recebeu este email porque tem notificações ativas na sua conta ${APP_CONFIG.name}. Para desativar, acesse seu perfil.
      </p>
    </div>
  </body>
</html>`;
}

/**
 * Envia email correspondente a uma notificação in-app. Respeita opt-out do
 * usuário (User.emailNotifications). Nunca lança — falhas são logadas.
 */
export async function sendNotificationEmail(
  input: SendNotificationEmailInput
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, emailNotifications: true, isActive: true },
    });

    if (!user) return { sent: false, reason: "user_not_found" };
    if (!user.isActive) return { sent: false, reason: "user_inactive" };
    if (!user.email) return { sent: false, reason: "no_email" };
    if (!user.emailNotifications) return { sent: false, reason: "opted_out" };

    const result = await sendEmail({
      to: user.email,
      subject: `${APP_CONFIG.name} — ${input.title}`,
      html: renderHtml(input),
    });

    if (!result.success) {
      return { sent: false, reason: result.error ?? "send_failed" };
    }
    return { sent: true };
  } catch (err) {
    console.error("[notifications-email] Exceção:", err);
    return { sent: false, reason: "exception" };
  }
}
