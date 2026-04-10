// Email — wrapper sobre Resend SDK
// Expõe sendEmail genérico e helpers de password reset / email change.

import { Resend } from "resend";
import { APP_CONFIG } from "@/lib/app.config";

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey && process.env.NODE_ENV === "production") {
  console.warn("[email] RESEND_API_KEY não configurada — emails não serão enviados");
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Envia um email genérico via Resend.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailInput): Promise<{ success: boolean; error?: string }> {
  try {
    if (!resend) {
      console.log(
        `[email] (dev) Email simulado para ${Array.isArray(to) ? to.join(",") : to}: ${subject}`
      );
      return { success: true };
    }

    const { error } = await resend.emails.send({
      from: APP_CONFIG.emailFrom,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("[email] Erro ao enviar:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[email] Exceção ao enviar:", err);
    return { success: false, error: "Erro ao enviar email" };
  }
}

/**
 * Envia email de redefinição de senha com link contendo token.
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `https://${APP_CONFIG.domain}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head><meta charset="utf-8" /><title>Redefinir senha</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #f5f5f5; padding: 32px;">
        <div style="max-width: 560px; margin: 0 auto; background: #141414; border: 1px solid #262626; border-radius: 12px; padding: 32px;">
          <h1 style="margin: 0 0 16px; font-size: 24px;">${APP_CONFIG.name}</h1>
          <h2 style="margin: 0 0 16px; font-size: 18px; color: #e5e5e5;">Redefinição de senha</h2>
          <p style="color: #a3a3a3; line-height: 1.6;">
            Recebemos uma solicitação para redefinir a senha da sua conta.
            Clique no botão abaixo para criar uma nova senha. O link expira em 1 hora.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: #3b82f6; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
              Redefinir senha
            </a>
          </div>
          <p style="color: #737373; font-size: 13px; line-height: 1.6;">
            Se você não solicitou esta alteração, ignore este email com segurança.
          </p>
          <p style="color: #525252; font-size: 12px; word-break: break-all; margin-top: 24px;">
            Ou copie e cole no navegador: ${resetUrl}
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `${APP_CONFIG.name} — Redefinir sua senha`,
    html,
  });
}

/**
 * Envia email de verificação para alteração de endereço de email.
 */
export async function sendEmailChangeVerification(
  email: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const verifyUrl = `https://${APP_CONFIG.domain}/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head><meta charset="utf-8" /><title>Verificar novo email</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #f5f5f5; padding: 32px;">
        <div style="max-width: 560px; margin: 0 auto; background: #141414; border: 1px solid #262626; border-radius: 12px; padding: 32px;">
          <h1 style="margin: 0 0 16px; font-size: 24px;">${APP_CONFIG.name}</h1>
          <h2 style="margin: 0 0 16px; font-size: 18px; color: #e5e5e5;">Confirme seu novo email</h2>
          <p style="color: #a3a3a3; line-height: 1.6;">
            Você solicitou alterar o email da sua conta para este endereço.
            Clique no botão abaixo para confirmar. O link expira em 1 hora.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verifyUrl}" style="display: inline-block; background: #3b82f6; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
              Confirmar novo email
            </a>
          </div>
          <p style="color: #737373; font-size: 13px; line-height: 1.6;">
            Se você não solicitou esta alteração, ignore este email e a alteração não será feita.
          </p>
          <p style="color: #525252; font-size: 12px; word-break: break-all; margin-top: 24px;">
            Ou copie e cole no navegador: ${verifyUrl}
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `${APP_CONFIG.name} — Confirme seu novo email`,
    html,
  });
}
