"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit-log";
import {
  gerarSecret,
  gerarQrCodeDataUrl,
  otpauthUri,
  verificarTotp,
  gerarBackupCodes,
  empacotarBackupHashes,
  envelopeSecret,
  desempacotarSecret,
} from "@/lib/two-factor/totp";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function iniciarSetup2fa(): Promise<
  ActionResult<{ qrDataUrl: string; secret: string }>
> {
  try {
    const user = await requireRole("viewer");
    const secret = gerarSecret();
    const uri = otpauthUri(user.email, secret);
    const qr = await gerarQrCodeDataUrl(uri);
    // Armazena secret em claro temporariamente em campo twoFactorSecret, ainda
    // com enabled=false. Ao confirmar, marca enabled=true.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: envelopeSecret(secret),
        twoFactorEnabled: false,
      },
    });
    return { success: true, data: { qrDataUrl: qr, secret } };
  } catch (err) {
    console.error("[2fa.iniciarSetup]", err);
    return { success: false, error: "Erro ao iniciar setup 2FA" };
  }
}

export async function confirmarSetup2fa(
  token: string
): Promise<ActionResult<{ backupCodes: string[] }>> {
  try {
    const user = await requireRole("viewer");
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorSecret: true },
    });
    if (!row?.twoFactorSecret) {
      return { success: false, error: "Setup não iniciado" };
    }
    const secret = desempacotarSecret(row.twoFactorSecret);
    if (!verificarTotp(token, secret)) {
      return { success: false, error: "Código inválido" };
    }
    const backup = gerarBackupCodes();
    const envelope = empacotarBackupHashes(backup);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorBackup: envelope,
        twoFactorVerifiedAt: new Date(),
      },
    });
    await logAudit({
      action: "user.2fa_enabled",
      resourceType: "user",
      resourceId: user.id,
      actorId: user.id,
      actorLabel: user.email,
    });
    revalidatePath("/profile");
    return { success: true, data: { backupCodes: backup } };
  } catch (err) {
    console.error("[2fa.confirmarSetup]", err);
    return { success: false, error: "Erro ao confirmar 2FA" };
  }
}

export async function desativar2fa(
  senha: string,
  token: string
): Promise<ActionResult> {
  try {
    const user = await requireRole("viewer");
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { password: true, twoFactorSecret: true, twoFactorEnabled: true },
    });
    if (!row || !row.twoFactorEnabled || !row.twoFactorSecret) {
      return { success: false, error: "2FA não está ativo" };
    }
    const ok = await bcrypt.compare(senha, row.password);
    if (!ok) return { success: false, error: "Senha incorreta" };
    const secret = desempacotarSecret(row.twoFactorSecret);
    if (!verificarTotp(token, secret)) {
      return { success: false, error: "Código inválido" };
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackup: null,
        twoFactorVerifiedAt: null,
      },
    });
    await logAudit({
      action: "user.2fa_disabled",
      resourceType: "user",
      resourceId: user.id,
      actorId: user.id,
      actorLabel: user.email,
    });
    revalidatePath("/profile");
    return { success: true };
  } catch (err) {
    console.error("[2fa.desativar]", err);
    return { success: false, error: "Erro ao desativar 2FA" };
  }
}

export async function status2fa(): Promise<
  ActionResult<{ enabled: boolean; verifiedAt: Date | null }>
> {
  try {
    const user = await requireRole("viewer");
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorEnabled: true, twoFactorVerifiedAt: true },
    });
    return {
      success: true,
      data: {
        enabled: row?.twoFactorEnabled ?? false,
        verifiedAt: row?.twoFactorVerifiedAt ?? null,
      },
    };
  } catch (err) {
    return { success: false, error: "Erro" };
  }
}
