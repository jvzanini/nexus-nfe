"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Monitor,
  Receipt,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Users as UsersIcon,
  User as UserIcon,
  Settings as SettingsIcon,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NAV_ITEMS } from "@/lib/constants/navigation";
import { APP_CONFIG } from "@/lib/app.config";

interface SidebarProps {
  user: {
    name: string;
    email: string;
    role: string;
    avatarUrl: string | null;
  };
}

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users: UsersIcon,
  User: UserIcon,
  Settings: SettingsIcon,
  FileText,
  Receipt,
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  manager: "Gestor",
  viewer: "Visualizador",
};

const easeOut = "easeOut" as const;

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();

  const THEME_CYCLE = ["dark", "light", "system"] as const;
  const THEME_ICONS = { dark: Moon, light: Sun, system: Monitor } as const;
  const THEME_LABELS = {
    dark: "Modo escuro",
    light: "Modo claro",
    system: "Sistema",
  } as const;

  function cycleTheme() {
    const current = (theme as keyof typeof THEME_ICONS) ?? "dark";
    const idx = THEME_CYCLE.indexOf(current);
    const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
    setTheme(next);
  }

  const currentTheme = (theme as keyof typeof THEME_ICONS) ?? "dark";
  const ThemeIcon = THEME_ICONS[currentTheme] ?? Moon;

  const items = NAV_ITEMS.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true;
    return (item.roles as readonly string[]).includes(user.role);
  });

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const roleLabel = ROLE_LABELS[user.role] || user.role;

  const sidebarContent = (
    <div className="flex h-full flex-col bg-background border-r border-border overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-[22%] bg-gradient-to-br from-violet-600 to-purple-600 shadow-[0_0_12px_rgba(124,58,237,0.35)] shrink-0">
          <Receipt className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-base font-bold text-foreground tracking-tight truncate">
              {APP_CONFIG.name}
            </h1>
            <p className="text-[11px] text-muted-foreground leading-none">
              {APP_CONFIG.description.slice(0, 28)}
            </p>
          </div>
        )}
      </div>

      {/* User info no topo */}
      <div className="px-4 pb-4 border-b border-border">
        <Link
          href="/profile"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-lg px-2 py-2 transition-all hover:bg-accent/50 cursor-pointer group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-semibold text-white overflow-hidden shrink-0">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
              <Badge variant="default" className="mt-0.5 text-[10px] py-0 px-1.5">
                {roleLabel}
              </Badge>
            </div>
          )}
        </Link>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item, index) => {
          const Icon = ICON_MAP[item.icon] || FileText;
          const active = isActive(item.href);
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: index * 0.05, ease: easeOut }}
            >
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
                  active
                    ? "bg-muted/50 text-violet-500 border-l-2 border-violet-500 pl-[10px]"
                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] transition-colors ${
                    active ? "text-violet-500" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-border px-4 py-4 space-y-2">
        <Button
          variant="ghost"
          onClick={cycleTheme}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 cursor-pointer"
          size="sm"
        >
          <ThemeIcon className="h-4 w-4" />
          {!collapsed && <span>{THEME_LABELS[currentTheme]}</span>}
        </Button>

        <Button
          variant="ghost"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
          size="sm"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </Button>

        {/* Collapse desktop */}
        <Button
          variant="ghost"
          onClick={() => setCollapsed((c) => !c)}
          className="hidden lg:flex w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 cursor-pointer"
          size="sm"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Recolher</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className={`hidden shrink-0 lg:block ${collapsed ? "w-20" : "w-60"} transition-all duration-200`}>
        {sidebarContent}
      </aside>

      {/* Mobile toggle */}
      <div className="fixed top-4 left-4 z-50 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="h-11 w-11 bg-card border border-border text-foreground hover:text-foreground cursor-pointer"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-60 lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
