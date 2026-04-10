"use server";

import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth-helpers";
import { sendPasswordResetEmail } from "@/lib/email";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hora
const ANTI_ENUMERATION_DELAY_MS = 100;

const RequestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const ResetSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Solicita redefinição de senha. Sempre retorna success para prevenir
 * enumeração de contas — envia email apenas se o usuário existir e estiver ativo.
 * Invalida tokens anteriores não usados antes de gerar um novo.
 */
export async function requestPasswordReset(email: string): Promise<ActionResult> {
  try {
    await delay(ANTI_ENUMERATION_DELAY_MS);

    const parsed = RequestSchema.safeParse({ email });
    if (!parsed.success) {
      // Mesma resposta para não vazar formato
      return { success: true };
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, email: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return { success: true };
    }

    // Invalida tokens anteriores não utilizados
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    await sendPasswordResetEmail(user.email, token);

    return { success: true };
  } catch (error) {
    console.error("[password-reset.requestPasswordReset]", error);
    // Ainda assim retorna success para manter anti-enumeração
    return { success: true };
  }
}

/**
 * Redefine a senha usando um token válido. Marca token como usado após sucesso.
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<ActionResult> {
  try {
    const parsed = ResetSchema.safeParse({ token, newPassword });
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { token: parsed.data.token },
      include: { user: { select: { id: true, isActive: true } } },
    });

    if (!record) {
      return { success: false, error: "Link inválido ou expirado" };
    }
    if (record.usedAt) {
      return { success: false, error: "Este link já foi utilizado" };
    }
    if (record.expiresAt < new Date()) {
      return { success: false, error: "Link expirado. Solicite um novo" };
    }
    if (!record.user.isActive) {
      return { success: false, error: "Conta desativada" };
    }

    const hashed = await hashPassword(parsed.data.newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: hashed },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Invalida quaisquer outros tokens pendentes do usuário
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: record.userId,
          usedAt: null,
          id: { not: record.id },
        },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("[password-reset.resetPassword]", error);
    return { success: false, error: "Erro ao redefinir senha" };
  }
}
