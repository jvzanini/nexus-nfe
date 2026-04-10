// Roles — definições e hierarquia de PlatformRole

import type { PlatformRole } from "@/generated/prisma/client";

export const ROLES: Record<PlatformRole, { label: string; description: string }> = {
  super_admin: {
    label: "Super Admin",
    description: "Acesso total à plataforma, incluindo configurações globais",
  },
  admin: {
    label: "Admin",
    description: "Gerencia usuários e operações do dia a dia",
  },
  manager: {
    label: "Gerente",
    description: "Acompanha indicadores e executa ações operacionais",
  },
  viewer: {
    label: "Visualizador",
    description: "Apenas leitura de dados e relatórios",
  },
};

/**
 * Hierarquia numérica: quanto maior, mais permissões.
 * super_admin (4) > admin (3) > manager (2) > viewer (1)
 */
export const ROLE_HIERARCHY: Record<PlatformRole, number> = {
  super_admin: 4,
  admin: 3,
  manager: 2,
  viewer: 1,
};

/**
 * Verifica se um usuário com `currentRole` pode gerenciar (criar/editar/deletar)
 * um usuário com `targetRole`. Só pode gerenciar papéis estritamente inferiores.
 */
export function canManageRole(
  currentRole: PlatformRole,
  targetRole: PlatformRole
): boolean {
  return ROLE_HIERARCHY[currentRole] > ROLE_HIERARCHY[targetRole];
}

/**
 * Lista de roles que `currentRole` pode atribuir ao criar/editar outro usuário.
 */
export function assignableRoles(currentRole: PlatformRole): PlatformRole[] {
  const currentLevel = ROLE_HIERARCHY[currentRole];
  return (Object.keys(ROLE_HIERARCHY) as PlatformRole[]).filter(
    (r) => ROLE_HIERARCHY[r] < currentLevel
  );
}
