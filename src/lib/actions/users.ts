"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, getCurrentUser } from "@/lib/auth";
import { hashPassword } from "@/lib/auth-helpers";
import { canManageRole, ROLES } from "@/lib/constants/roles";
import type { PlatformRole } from "@/generated/prisma/client";

// --- Types ---

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  platformRole: PlatformRole;
  platformRoleLabel: string;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: Date;
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * Shape compatível com o users-content (adaptado do projeto de referência).
 * Em single-tenant `companiesCount` fica sempre 0.
 */
export interface UserItem {
  id: string;
  name: string;
  email: string;
  platformRole: PlatformRole;
  /** Label amigável (ex: "Super Admin", "Gerente"...). */
  highestRole: string;
  isActive: boolean;
  canEdit: boolean;
  canDelete: boolean;
  avatarUrl: string | null;
  createdAt: Date;
  companiesCount: number;
}

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

// --- Validation ---

const PlatformRoleEnum = z.enum(["super_admin", "admin", "manager", "viewer"]);

const CreateUserSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres").max(100),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  platformRole: PlatformRoleEnum,
});

const UpdateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  password: z.string().min(8).optional(),
  platformRole: PlatformRoleEnum.optional(),
  isActive: z.boolean().optional(),
});

// --- Actions ---

/**
 * Lista todos os usuários da plataforma.
 * Disponível para admin+.
 */
export async function listUsers(): Promise<ActionResult<UserListItem[]>> {
  try {
    const currentUser = await requireRole("admin");

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        platformRole: true,
        isActive: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    const data: UserListItem[] = users.map((u) => {
      const isSelf = u.id === currentUser.id;
      const manageable =
        !isSelf && canManageRole(currentUser.platformRole, u.platformRole);

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        platformRole: u.platformRole,
        platformRoleLabel: ROLES[u.platformRole]?.label ?? u.platformRole,
        isActive: u.isActive,
        avatarUrl: u.avatarUrl,
        createdAt: u.createdAt,
        canEdit: manageable,
        canDelete: manageable,
      };
    });

    return { success: true, data };
  } catch (error) {
    console.error("[users.listUsers]", error);
    return { success: false, error: "Erro ao listar usuários" };
  }
}

/**
 * Cria um novo usuário. Apenas admin+ pode criar, e só roles abaixo da sua.
 */
export async function createUser(
  input: z.infer<typeof CreateUserSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const currentUser = await requireRole("admin");

    const parsed = CreateUserSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const data = parsed.data;

    // Hierarquia: só pode criar role estritamente abaixo
    if (!canManageRole(currentUser.platformRole, data.platformRole)) {
      return {
        success: false,
        error: "Sem permissão para criar usuário com esse nível de acesso",
      };
    }

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (existing) {
      return { success: false, error: "E-mail já cadastrado" };
    }

    const hashed = await hashPassword(data.password);

    const created = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashed,
        platformRole: data.platformRole,
        isSuperAdmin: data.platformRole === "super_admin",
        invitedById: currentUser.id,
      },
      select: { id: true },
    });

    revalidatePath("/users");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    console.error("[users.createUser]", error);
    return { success: false, error: "Erro ao criar usuário" };
  }
}

/**
 * Atualiza um usuário. Valida hierarquia e previne alterações no próprio usuário.
 */
export async function updateUser(
  id: string,
  input: z.infer<typeof UpdateUserSchema>
): Promise<ActionResult> {
  try {
    const currentUser = await requireRole("admin");

    const parsed = UpdateUserSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, platformRole: true },
    });
    if (!target) return { success: false, error: "Usuário não encontrado" };

    if (target.id === currentUser.id) {
      return {
        success: false,
        error: "Use o perfil para alterar seus próprios dados",
      };
    }

    if (!canManageRole(currentUser.platformRole, target.platformRole)) {
      return { success: false, error: "Sem permissão para editar este usuário" };
    }

    const data = parsed.data;

    // Se mudando role, validar hierarquia do novo role
    if (data.platformRole && !canManageRole(currentUser.platformRole, data.platformRole)) {
      return {
        success: false,
        error: "Sem permissão para atribuir esse nível de acesso",
      };
    }

    // Verificar email duplicado
    if (data.email) {
      const clash = await prisma.user.findFirst({
        where: { email: data.email, id: { not: id } },
        select: { id: true },
      });
      if (clash) return { success: false, error: "E-mail já em uso" };
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.password !== undefined) {
      updateData.password = await hashPassword(data.password);
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.platformRole !== undefined) {
      updateData.platformRole = data.platformRole;
      updateData.isSuperAdmin = data.platformRole === "super_admin";
    }

    await prisma.user.update({ where: { id }, data: updateData });

    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    console.error("[users.updateUser]", error);
    return { success: false, error: "Erro ao atualizar usuário" };
  }
}

/**
 * Soft delete: marca usuário como inativo. Previne auto-deleção.
 */
export async function deleteUser(id: string): Promise<ActionResult> {
  try {
    const currentUser = await requireRole("admin");

    if (id === currentUser.id) {
      return { success: false, error: "Você não pode excluir a si mesmo" };
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, platformRole: true, isActive: true },
    });
    if (!target) return { success: false, error: "Usuário não encontrado" };

    if (!canManageRole(currentUser.platformRole, target.platformRole)) {
      return { success: false, error: "Sem permissão para excluir este usuário" };
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    console.error("[users.deleteUser]", error);
    return { success: false, error: "Erro ao excluir usuário" };
  }
}

/**
 * Altera o role de um usuário. Previne rebaixamento do próprio usuário.
 */
export async function toggleUserRole(
  id: string,
  newRole: PlatformRole
): Promise<ActionResult> {
  try {
    const currentUser = await requireRole("admin");

    const parsed = PlatformRoleEnum.safeParse(newRole);
    if (!parsed.success) {
      return { success: false, error: "Role inválido" };
    }

    if (id === currentUser.id) {
      return {
        success: false,
        error: "Você não pode alterar seu próprio nível de acesso",
      };
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, platformRole: true },
    });
    if (!target) return { success: false, error: "Usuário não encontrado" };

    if (!canManageRole(currentUser.platformRole, target.platformRole)) {
      return { success: false, error: "Sem permissão para alterar este usuário" };
    }

    if (!canManageRole(currentUser.platformRole, parsed.data)) {
      return {
        success: false,
        error: "Sem permissão para atribuir esse nível de acesso",
      };
    }

    await prisma.user.update({
      where: { id },
      data: {
        platformRole: parsed.data,
        isSuperAdmin: parsed.data === "super_admin",
      },
    });

    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    console.error("[users.toggleUserRole]", error);
    return { success: false, error: "Erro ao alterar nível de acesso" };
  }
}

/** Alias de toggleUserRole (compatibilidade com UI). */
export const updateUserRole = toggleUserRole;

/**
 * Alias de listUsers retornando o shape `UserItem` (compatível com o
 * users-content do projeto de referência). Em single-tenant `companiesCount`
 * é sempre 0.
 */
export async function getUsers(): Promise<ActionResult<UserItem[]>> {
  const result = await listUsers();
  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }
  const mapped: UserItem[] = result.data.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    platformRole: u.platformRole,
    highestRole: u.platformRoleLabel,
    isActive: u.isActive,
    canEdit: u.canEdit,
    canDelete: u.canDelete,
    avatarUrl: u.avatarUrl,
    createdAt: u.createdAt,
    companiesCount: 0,
  }));
  return { success: true, data: mapped };
}

// Re-exporta getCurrentUser para conveniência em components
export { getCurrentUser };
