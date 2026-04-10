// Navigation — itens do menu principal com controle por role

import type { PlatformRole } from "@/generated/prisma/client";

export interface NavItem {
  href: string;
  label: string;
  /** Nome do ícone no pacote lucide-react (ex: "LayoutDashboard") */
  icon: string;
  /** Roles que enxergam esse item. Vazio/undefined = todos autenticados. */
  roles?: PlatformRole[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    roles: ["super_admin", "admin", "manager", "viewer"],
  },
  {
    href: "/users",
    label: "Usuários",
    icon: "Users",
    roles: ["super_admin", "admin"],
  },
  {
    href: "/settings",
    label: "Configurações",
    icon: "Settings",
    roles: ["super_admin"],
  },
  {
    href: "/profile",
    label: "Perfil",
    icon: "User",
    roles: ["super_admin", "admin", "manager", "viewer"],
  },
];

/**
 * Retorna apenas os itens visíveis para o role informado.
 */
export function getNavItemsForRole(role: PlatformRole): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
