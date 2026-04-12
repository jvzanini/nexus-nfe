// Configuração centralizada de navegação
// Usado por: sidebar

import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  Building2,
  type LucideIcon,
} from "lucide-react";

import type { PlatformRole } from "@/generated/prisma/client";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Roles que podem ver este item. Se undefined, todos veem */
  allowedRoles?: string[];
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clientes MEI", href: "/clientes", icon: Building2 },
  { label: "Notas Fiscais", href: "/nfe", icon: FileText },
];

export const RESTRICTED_NAV_ITEMS: NavItem[] = [
  {
    label: "Usuários",
    href: "/users",
    icon: Users,
    allowedRoles: ["super_admin", "admin"],
  },
  {
    label: "Configurações",
    href: "/settings",
    icon: Settings,
    allowedRoles: ["super_admin"],
  },
];

/** Retorna todos os itens de navegação visíveis para o role */
export function getNavItems(platformRole: string): NavItem[] {
  const restricted = RESTRICTED_NAV_ITEMS.filter(
    (item) => !item.allowedRoles || item.allowedRoles.includes(platformRole)
  );
  return [...MAIN_NAV_ITEMS, ...restricted];
}

/**
 * Labels amigáveis por role — usado no layout protegido para exibir o "cargo"
 * do usuário logado na sidebar.
 */
export const ROLE_LABELS: Record<PlatformRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Gerente",
  viewer: "Visualizador",
};

/**
 * @deprecated Use getNavItems(). Mantido como compatibilidade — em breve removido.
 */
export const NAV_ITEMS = [...MAIN_NAV_ITEMS, ...RESTRICTED_NAV_ITEMS];

/**
 * @deprecated Use getNavItems().
 */
export function getNavItemsForRole(role: PlatformRole): NavItem[] {
  return getNavItems(role);
}
