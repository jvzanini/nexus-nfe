import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { checkLoginRateLimit } from "@/lib/rate-limit";

type PlatformRole = "super_admin" | "admin" | "manager" | "viewer";

interface Credentials {
  email: string;
  password: string;
  otp?: string;
}

interface AuthUser {
  id: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
  platformRole: PlatformRole;
  avatarUrl: string | null;
  theme: string;
}

/**
 * Hash de senha usando bcrypt (cost factor 12).
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

/**
 * Compara senha em texto com hash bcrypt armazenado.
 */
export async function verifyPassword(
  plain: string,
  hashed: string
): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

// Hierarquia de roles (maior = mais privilégios)
const ROLE_LEVELS: Record<PlatformRole, number> = {
  viewer: 1,
  manager: 2,
  admin: 3,
  super_admin: 4,
};

/**
 * Verifica se a role do usuário é suficiente para acessar um recurso
 * que exige a role alvo.
 */
export function canAccessRole(
  userRole: PlatformRole | string,
  requiredRole: PlatformRole
): boolean {
  const userLevel = ROLE_LEVELS[userRole as PlatformRole] ?? 0;
  const requiredLevel = ROLE_LEVELS[requiredRole] ?? 0;
  return userLevel >= requiredLevel;
}

/**
 * Autoriza credenciais de login. Verifica rate limit, busca usuário,
 * checa isActive e compara senha. Retorna dados do usuário autenticado
 * ou null se inválido.
 */
export async function authorizeCredentials(
  credentials: Credentials,
  ipAddress: string
): Promise<AuthUser | null> {
  const { email, password } = credentials;

  if (!email || !password) {
    return null;
  }

  // Rate limit antes de qualquer operação (previne enumeração + brute force)
  const rateLimit = await checkLoginRateLimit(email, ipAddress);
  if (!rateLimit.allowed) {
    throw new Error(
      "Muitas tentativas de login. Tente novamente mais tarde."
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      isSuperAdmin: true,
      platformRole: true,
      isActive: true,
      avatarUrl: true,
      theme: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
      twoFactorBackup: true,
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  const isPasswordValid = await verifyPassword(password, user.password);
  if (!isPasswordValid) {
    return null;
  }

  if (user.twoFactorEnabled && user.twoFactorSecret) {
    const { otp } = credentials;
    if (!otp) {
      throw new Error("2FA_REQUIRED");
    }
    const { verificarTotp, desempacotarSecret, consumirBackupCode } =
      await import("@/lib/two-factor/totp");
    const secret = desempacotarSecret(user.twoFactorSecret);
    const totpOk = verificarTotp(otp, secret);
    if (!totpOk) {
      // tenta backup code
      if (user.twoFactorBackup) {
        const novo = consumirBackupCode(user.twoFactorBackup, otp);
        if (novo) {
          await prisma.user.update({
            where: { id: user.id },
            data: { twoFactorBackup: novo },
          });
        } else {
          return null;
        }
      } else {
        return null;
      }
    }
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isSuperAdmin: user.isSuperAdmin,
    platformRole: user.platformRole as PlatformRole,
    avatarUrl: user.avatarUrl,
    theme: user.theme as unknown as string,
  };
}

const PUBLIC_ROUTES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];
const PUBLIC_PREFIXES = ["/api/auth/", "/api/health"];

export function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
