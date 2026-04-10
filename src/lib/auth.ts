import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { canAccessRole } from "@/lib/auth-helpers";

export type PlatformRole = "super_admin" | "admin" | "manager" | "viewer";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  platformRole: PlatformRole;
  /** Alias de platformRole para ergonomia em componentes de UI. */
  role: PlatformRole;
  avatarUrl: string | null;
  theme: string;
}

/**
 * Retorna o usuário autenticado da sessão atual.
 * Retorna null se não autenticado.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const user = session.user as any;

  const platformRole: PlatformRole = user.platformRole ?? "viewer";

  return {
    id: user.id,
    name: user.name ?? "",
    email: user.email ?? "",
    isSuperAdmin: user.isSuperAdmin ?? false,
    platformRole,
    role: platformRole,
    avatarUrl: user.avatarUrl ?? null,
    theme: user.theme ?? "dark",
  };
}

/**
 * Garante que existe um usuário autenticado. Se não, redireciona para /login.
 * Uso em Server Components / Server Actions.
 */
export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Garante que o usuário autenticado possui a role mínima exigida.
 * Redireciona para /login se não autenticado, ou para / se sem permissão.
 */
export async function requireRole(
  role: PlatformRole | PlatformRole[]
): Promise<CurrentUser> {
  const user = await requireAuth();

  if (user.isSuperAdmin) return user;

  const allowed = Array.isArray(role)
    ? role.some((r) => canAccessRole(user.platformRole, r))
    : canAccessRole(user.platformRole, role);

  if (!allowed) {
    redirect("/");
  }

  return user;
}
