"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

type ActionResult<T = unknown> = { success: boolean; data?: T; error?: string };

export interface MemberItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  platformRole: string;
  isSuperAdmin: boolean;
  companyRole: string;
  createdAt: Date;
}

export async function listMembers(clienteMeiId: string): Promise<ActionResult<MemberItem[]>> {
  try {
    await requireRole("admin");
    const members = await prisma.empresaMembership.findMany({
      where: { clienteMeiId },
      include: { user: { select: { id: true, name: true, email: true, platformRole: true, isSuperAdmin: true } } },
      orderBy: { createdAt: "asc" },
    });
    return {
      success: true,
      data: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        userName: m.user.name,
        userEmail: m.user.email,
        platformRole: m.user.platformRole,
        isSuperAdmin: m.user.isSuperAdmin,
        companyRole: m.role,
        createdAt: m.createdAt,
      })),
    };
  } catch (error) {
    console.error("[empresa-memberships.list]", error);
    return { success: false, error: "Erro ao listar membros" };
  }
}

export async function addMember(clienteMeiId: string, userId: string, role: string): Promise<ActionResult> {
  try {
    await requireRole("admin");
    await prisma.empresaMembership.create({ data: { clienteMeiId, userId, role } });
    return { success: true };
  } catch (error) {
    if ((error as any)?.code === "P2002") return { success: false, error: "Usuário já é membro" };
    console.error("[empresa-memberships.add]", error);
    return { success: false, error: "Erro ao adicionar membro" };
  }
}

export async function updateMemberRole(membershipId: string, role: string): Promise<ActionResult> {
  try {
    await requireRole("admin");
    await prisma.empresaMembership.update({ where: { id: membershipId }, data: { role } });
    return { success: true };
  } catch (error) {
    console.error("[empresa-memberships.updateRole]", error);
    return { success: false, error: "Erro ao atualizar papel" };
  }
}

export async function removeMember(membershipId: string): Promise<ActionResult> {
  try {
    await requireRole("admin");
    await prisma.empresaMembership.delete({ where: { id: membershipId } });
    return { success: true };
  } catch (error) {
    console.error("[empresa-memberships.remove]", error);
    return { success: false, error: "Erro ao remover membro" };
  }
}

export async function listAvailableUsers(
  clienteMeiId: string
): Promise<ActionResult<Array<{ id: string; name: string; email: string; platformRole: string }>>> {
  try {
    await requireRole("admin");
    const existing = await prisma.empresaMembership.findMany({
      where: { clienteMeiId },
      select: { userId: true },
    });
    const existingIds = existing.map((m) => m.userId);
    const users = await prisma.user.findMany({
      where: { isActive: true, id: { notIn: existingIds } },
      select: { id: true, name: true, email: true, platformRole: true },
      orderBy: { name: "asc" },
    });
    return { success: true, data: users };
  } catch (error) {
    console.error("[empresa-memberships.listAvailable]", error);
    return { success: false, error: "Erro ao listar usuários" };
  }
}
