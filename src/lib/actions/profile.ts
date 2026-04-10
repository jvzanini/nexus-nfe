"use server";

import { z } from "zod";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/auth-helpers";
import { sendEmailChangeVerification } from "@/lib/email";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hora

// --- Validation ---

const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres").max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  theme: z.enum(["dark", "light", "system"]).optional(),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual obrigatória"),
  newPassword: z.string().min(8, "Nova senha deve ter no mínimo 8 caracteres"),
});

const RequestEmailChangeSchema = z.object({
  newEmail: z.string().trim().toLowerCase().email("E-mail inválido"),
});

// --- Actions ---

/**
 * Atualiza apenas o avatar do usuário atual.
 * Aceita URL (string) ou null pra remover.
 */
export async function updateAvatar(
  avatarUrl: string | null
): Promise<ActionResult> {
  return updateProfile({ avatarUrl });
}

/**
 * Atualiza nome, avatar e tema do usuário atual.
 */
export async function updateProfile(
  input: z.infer<typeof UpdateProfileSchema>
): Promise<ActionResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Não autenticado" };

    const parsed = UpdateProfileSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.theme !== undefined) updateData.theme = data.theme;

    if (Object.keys(updateData).length === 0) {
      return { success: true };
    }

    await prisma.user.update({
      where: { id: currentUser.id },
      data: updateData,
    });

    revalidatePath("/profile");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("[profile.updateProfile]", error);
    return { success: false, error: "Erro ao atualizar perfil" };
  }
}

/**
 * Altera a senha do usuário atual. Exige senha atual correta.
 */
export async function changePassword(
  input: z.infer<typeof ChangePasswordSchema>
): Promise<ActionResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Não autenticado" };

    const parsed = ChangePasswordSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { password: true },
    });
    if (!user) return { success: false, error: "Usuário não encontrado" };

    const valid = await verifyPassword(parsed.data.currentPassword, user.password);
    if (!valid) return { success: false, error: "Senha atual incorreta" };

    const hashed = await hashPassword(parsed.data.newPassword);
    await prisma.user.update({
      where: { id: currentUser.id },
      data: { password: hashed },
    });

    return { success: true };
  } catch (error) {
    console.error("[profile.changePassword]", error);
    return { success: false, error: "Erro ao alterar senha" };
  }
}

/**
 * Solicita alteração de email. Gera token e envia verificação ao novo endereço.
 */
export async function requestEmailChange(
  newEmail: string
): Promise<ActionResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Não autenticado" };

    const parsed = RequestEmailChangeSchema.safeParse({ newEmail });
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "E-mail inválido",
      };
    }

    const normalized = parsed.data.newEmail;

    if (normalized === currentUser.email) {
      return { success: false, error: "O novo e-mail é igual ao atual" };
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true },
    });
    if (existing) {
      return { success: false, error: "Este e-mail já está em uso" };
    }

    // Invalida tokens anteriores não utilizados
    await prisma.emailChangeToken.deleteMany({
      where: { userId: currentUser.id, usedAt: null },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

    await prisma.emailChangeToken.create({
      data: {
        userId: currentUser.id,
        newEmail: normalized,
        token,
        expiresAt,
      },
    });

    await sendEmailChangeVerification(normalized, token);

    return { success: true };
  } catch (error) {
    console.error("[profile.requestEmailChange]", error);
    return { success: false, error: "Erro ao solicitar alteração de email" };
  }
}

/**
 * Confirma a alteração de email usando o token recebido por email.
 */
export async function confirmEmailChange(token: string): Promise<ActionResult> {
  try {
    if (!token) return { success: false, error: "Token inválido" };

    const record = await prisma.emailChangeToken.findUnique({
      where: { token },
      include: { user: { select: { id: true, isActive: true } } },
    });

    if (!record) return { success: false, error: "Link inválido ou expirado" };
    if (record.usedAt) return { success: false, error: "Este link já foi utilizado" };
    if (record.expiresAt < new Date()) {
      return { success: false, error: "Link expirado. Solicite novamente" };
    }
    if (!record.user.isActive) {
      return { success: false, error: "Conta desativada" };
    }

    // Garantir que o email continua disponível
    const clash = await prisma.user.findUnique({
      where: { email: record.newEmail },
      select: { id: true },
    });
    if (clash && clash.id !== record.userId) {
      return { success: false, error: "Este e-mail já está em uso por outra conta" };
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { email: record.newEmail },
      }),
      prisma.emailChangeToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("[profile.confirmEmailChange]", error);
    return { success: false, error: "Erro ao confirmar alteração de email" };
  }
}
