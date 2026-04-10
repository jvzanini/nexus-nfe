"use client";

import { useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Plus, Trash2, UserPlus, X, Mail, User as UserIcon, Search } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  listUsers,
  createUser,
  deleteUser,
  updateUserRole,
} from "@/lib/actions/users";

const easeOut = "easeOut" as const;

type Role = "super_admin" | "admin" | "manager" | "viewer";

interface PlatformUser {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  createdAt: string | Date;
}

const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  manager: "Gestor",
  viewer: "Visualizador",
};

const ROLE_VARIANTS: Record<Role, "default" | "secondary" | "success" | "warning"> = {
  super_admin: "warning",
  admin: "default",
  manager: "success",
  viewer: "secondary",
};

interface Props {
  currentRole: string;
}

export function UsersContent({ currentRole }: Props) {
  const isSuperAdmin = currentRole === "super_admin";
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PlatformUser | null>(null);
  const [isPending, startTransition] = useTransition();

  async function load() {
    setLoading(true);
    try {
      const result = await listUsers();
      const list = Array.isArray(result?.data) ? result.data : [];
      const mapped: PlatformUser[] = list.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.platformRole as Role,
        createdAt: u.createdAt,
      }));
      setUsers(mapped);
    } catch {
      toast.error("Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleRoleChange(user: PlatformUser, nextRole: Role) {
    if (nextRole === user.role) return;
    startTransition(async () => {
      try {
        const result = await updateUserRole(user.id, nextRole);
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success(`Role atualizada para ${ROLE_LABELS[nextRole]}`);
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u)));
      } catch {
        toast.error("Erro ao atualizar role.");
      }
    });
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
      platformRole: String(formData.get("role") || "viewer") as Role,
    };

    startTransition(async () => {
      try {
        const result = await createUser(payload);
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Usuário criado com sucesso!");
        setCreateOpen(false);
        load();
      } catch {
        toast.error("Erro ao criar usuário.");
      }
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        const result = await deleteUser(deleteTarget.id);
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Usuário removido.");
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
        setDeleteTarget(null);
      } catch {
        toast.error("Erro ao remover usuário.");
      }
    });
  }

  const filtered = users.filter((u) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (u.name || "").toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const availableRoles: Role[] = isSuperAdmin
    ? ["super_admin", "admin", "manager", "viewer"]
    : ["admin", "manager", "viewer"];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: easeOut }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie acessos e permissões da plataforma.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="lg">
          <Plus className="h-4 w-4" /> Novo usuário
        </Button>
      </motion.div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card className="py-0 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando usuários...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <UserPlus className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">Nenhum usuário encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="text-left font-medium px-5 py-3">Usuário</th>
                    <th className="text-left font-medium px-5 py-3">E-mail</th>
                    <th className="text-left font-medium px-5 py-3">Role</th>
                    <th className="text-right font-medium px-5 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-border/60 last:border-0 transition-colors hover:bg-muted/30"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-semibold text-white shrink-0">
                            {(u.name || u.email).charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground">
                            {u.name || "Sem nome"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <div className="inline-flex items-center gap-2">
                          <Badge variant={ROLE_VARIANTS[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u, e.target.value as Role)}
                            disabled={isPending}
                            className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                          >
                            {availableRoles.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => setDeleteTarget(u)}
                          aria-label="Remover usuário"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create modal */}
      <AnimatePresence>
        {createOpen && (
          <Modal onClose={() => setCreateOpen(false)} title="Novo usuário">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">
                  <UserIcon className="inline h-3.5 w-3.5 mr-1 -mt-0.5" /> Nome
                </Label>
                <Input id="new-name" name="name" required placeholder="Nome completo" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-email">
                  <Mail className="inline h-3.5 w-3.5 mr-1 -mt-0.5" /> E-mail
                </Label>
                <Input id="new-email" name="email" type="email" required placeholder="email@dominio.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Senha temporária</Label>
                <Input id="new-password" name="password" type="password" minLength={8} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-role">Role</Label>
                <select
                  id="new-role"
                  name="role"
                  defaultValue="viewer"
                  className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                >
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending} className="flex-1">
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Criando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" /> Criar
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Delete modal */}
      <AnimatePresence>
        {deleteTarget && (
          <Modal onClose={() => setDeleteTarget(null)} title="Remover usuário">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja remover <span className="font-semibold text-foreground">{deleteTarget.name || deleteTarget.email}</span>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 pt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Removendo...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" /> Remover
                  </>
                )}
              </Button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 4 }}
          transition={{ duration: 0.18, ease: "easeOut" as const }}
          className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl pointer-events-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {children}
        </motion.div>
      </div>
    </>
  );
}
