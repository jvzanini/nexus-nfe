"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Download,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  listClientesMei,
  getClienteMei,
  createClienteMei,
  updateClienteMei,
  deleteClienteMei,
  fetchCnpjBrasilApi,
  type ClienteMeiListItem,
} from "@/lib/actions/clientes-mei";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

// --- Form ---

interface ClienteFormData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoMunicipal: string;
  email: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidadeNome: string;
  municipioIbge: string; // derivado — não editado diretamente no form
  uf: string;
  isActive: boolean;
}

const emptyForm: ClienteFormData = {
  cnpj: "",
  razaoSocial: "",
  nomeFantasia: "",
  inscricaoMunicipal: "",
  email: "",
  telefone: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidadeNome: "Brasília",
  municipioIbge: "5300108",
  uf: "DF",
  isActive: true,
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium text-foreground/80 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function formatCnpj(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatCep(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
}

// --- Components ---

function TableSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-lg bg-muted/50 border border-border"
        />
      ))}
    </div>
  );
}

function CertBadge({
  valido,
  expiraEm,
}: {
  valido: boolean;
  expiraEm: Date | null;
}) {
  if (!expiraEm) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-muted-foreground">
        <ShieldOff className="h-3 w-3" />
        Sem cert.
      </span>
    );
  }
  const dias = differenceInDays(expiraEm, new Date());
  if (!valido || dias < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
        <ShieldOff className="h-3 w-3" />
        Expirado
      </span>
    );
  }
  if (dias <= 30) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
        <ShieldAlert className="h-3 w-3" />
        Expira em {dias}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
      <ShieldCheck className="h-3 w-3" />
      Válido
    </span>
  );
}

// --- Main ---

export function ClientesContent() {
  const [clientes, setClientes] = useState<ClienteMeiListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClienteFormData>(emptyForm);
  const [saving, startSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();
  const [fetchingCnpj, startFetchCnpj] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] =
    useState<ClienteMeiListItem | null>(null);

  async function loadClientes() {
    const result = await listClientesMei();
    if (result.success && result.data) {
      setClientes(result.data);
    } else {
      toast.error(result.error || "Erro ao carregar clientes");
    }
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    loadClientes();
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setCreateOpen(true);
  }

  function openEdit(c: ClienteMeiListItem) {
    startSaving(async () => {
      setEditingId(c.id);
      const det = await getClienteMei(c.id);
      if (!det.success || !det.data) {
        toast.error(det.error || "Erro ao carregar cliente");
        return;
      }
      const d = det.data;
      setForm({
        cnpj: formatCnpj(d.cnpj),
        razaoSocial: d.razaoSocial,
        nomeFantasia: d.nomeFantasia ?? "",
        inscricaoMunicipal: d.inscricaoMunicipal ?? "",
        email: d.email ?? "",
        telefone: d.telefone ?? "",
        cep: formatCep(d.cep),
        logradouro: d.logradouro,
        numero: d.numero,
        complemento: d.complemento ?? "",
        bairro: d.bairro,
        cidadeNome: "",
        municipioIbge: d.municipioIbge,
        uf: d.uf,
        isActive: d.isActive,
      });
      setEditOpen(true);
    });
  }

  function openDeleteDialog(c: ClienteMeiListItem) {
    setClienteToDelete(c);
    setDeleteDialogOpen(true);
  }

  function handleFetchCnpj() {
    const digits = form.cnpj.replace(/\D/g, "");
    if (digits.length !== 14) {
      toast.error("Informe um CNPJ completo (14 dígitos)");
      return;
    }
    startFetchCnpj(async () => {
      const result = await fetchCnpjBrasilApi(digits);
      if (!result.success || !result.data) {
        toast.error(result.error || "Falha ao consultar CNPJ");
        return;
      }
      const d = result.data;
      setForm((f) => ({
        ...f,
        razaoSocial: d.razao_social,
        nomeFantasia: d.nome_fantasia ?? "",
        email: d.email ?? "",
        telefone: d.ddd_telefone_1 ?? "",
        cep: formatCep(d.cep ?? ""),
        logradouro: d.logradouro ?? "",
        numero: d.numero ?? "",
        complemento: d.complemento ?? "",
        bairro: d.bairro ?? "",
        cidadeNome: d.municipio ?? f.cidadeNome,
        municipioIbge: String(d.codigo_municipio_ibge ?? f.municipioIbge),
        uf: d.uf ?? f.uf,
      }));
      toast.success("Dados carregados da Receita");
    });
  }

  function buildPayload() {
    return {
      cnpj: form.cnpj.replace(/\D/g, ""),
      razaoSocial: form.razaoSocial.trim(),
      nomeFantasia: form.nomeFantasia.trim() || undefined,
      inscricaoMunicipal: form.inscricaoMunicipal.trim() || undefined,
      email: form.email.trim() || undefined,
      telefone: form.telefone.trim() || undefined,
      cep: form.cep.replace(/\D/g, ""),
      logradouro: form.logradouro.trim(),
      numero: form.numero.trim(),
      complemento: form.complemento.trim() || undefined,
      bairro: form.bairro.trim(),
      municipioIbge: form.municipioIbge,
      uf: form.uf,
      serieDpsAtual: "00001",
    };
  }

  function handleSubmitCreate() {
    startSaving(async () => {
      const result = await createClienteMei(buildPayload());
      if (result.success) {
        toast.success("Cliente cadastrado");
        setCreateOpen(false);
        setForm(emptyForm);
        await loadClientes();
      } else {
        toast.error(result.error || "Erro ao cadastrar cliente");
      }
    });
  }

  function handleSubmitEdit() {
    if (!editingId) return;
    startSaving(async () => {
      const result = await updateClienteMei(editingId, {
        ...buildPayload(),
        isActive: form.isActive,
      });
      if (result.success) {
        toast.success("Cliente atualizado");
        setEditOpen(false);
        await loadClientes();
      } else {
        toast.error(result.error || "Erro ao atualizar cliente");
      }
    });
  }

  function handleConfirmDelete() {
    if (!clienteToDelete) return;
    startDeleting(async () => {
      const result = await deleteClienteMei(clienteToDelete.id);
      if (result.success) {
        toast.success("Cliente inativado");
        setDeleteDialogOpen(false);
        setClienteToDelete(null);
        await loadClientes();
      } else {
        toast.error(result.error || "Erro ao excluir cliente");
      }
    });
  }

  function renderForm() {
    return (
      <div className="space-y-4">
        {/* CNPJ + auto-fill */}
        <Field label="CNPJ">
          <div className="flex gap-2">
            <Input
              value={form.cnpj}
              onChange={(e) =>
                setForm((f) => ({ ...f, cnpj: formatCnpj(e.target.value) }))
              }
              placeholder="00.000.000/0000-00"
              className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleFetchCnpj}
              disabled={fetchingCnpj}
              className="shrink-0 gap-2 cursor-pointer"
            >
              {fetchingCnpj ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Buscar
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Clique em Buscar pra preencher automaticamente via Receita
          </p>
        </Field>

        {/* Razão social (full width) */}
        <Field label="Razão social">
          <Input
            value={form.razaoSocial}
            onChange={(e) =>
              setForm((f) => ({ ...f, razaoSocial: e.target.value }))
            }
            className="bg-muted/50 border-border text-foreground"
          />
        </Field>

        {/* Nome fantasia (full width) */}
        <Field label="Nome fantasia">
          <Input
            value={form.nomeFantasia}
            onChange={(e) =>
              setForm((f) => ({ ...f, nomeFantasia: e.target.value }))
            }
            className="bg-muted/50 border-border text-foreground"
          />
        </Field>

        {/* E-mail + Telefone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="E-mail">
            <Input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              className="bg-muted/50 border-border text-foreground"
            />
          </Field>
          <Field label="Telefone">
            <Input
              value={form.telefone}
              onChange={(e) =>
                setForm((f) => ({ ...f, telefone: e.target.value }))
              }
              className="bg-muted/50 border-border text-foreground"
            />
          </Field>
        </div>

        {/* CEP (small) + Logradouro (large) */}
        <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4">
          <Field label="CEP">
            <Input
              value={form.cep}
              onChange={(e) =>
                setForm((f) => ({ ...f, cep: formatCep(e.target.value) }))
              }
              placeholder="00000-000"
              className="bg-muted/50 border-border text-foreground"
            />
          </Field>
          <Field label="Logradouro">
            <Input
              value={form.logradouro}
              onChange={(e) =>
                setForm((f) => ({ ...f, logradouro: e.target.value }))
              }
              className="bg-muted/50 border-border text-foreground"
            />
          </Field>
        </div>

        {/* Número (small) + Complemento (large) */}
        <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-4">
          <Field label="Número">
            <Input
              value={form.numero}
              onChange={(e) =>
                setForm((f) => ({ ...f, numero: e.target.value }))
              }
              className="bg-muted/50 border-border text-foreground"
            />
          </Field>
          <Field label="Complemento">
            <Input
              value={form.complemento}
              onChange={(e) =>
                setForm((f) => ({ ...f, complemento: e.target.value }))
              }
              className="bg-muted/50 border-border text-foreground"
            />
          </Field>
        </div>

        {/* Bairro (full width) */}
        <Field label="Bairro">
          <Input
            value={form.bairro}
            onChange={(e) =>
              setForm((f) => ({ ...f, bairro: e.target.value }))
            }
            className="bg-muted/50 border-border text-foreground"
          />
        </Field>

        {/* Cidade + UF + Inscrição Municipal */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_80px_1fr] gap-4">
          <Field label="Cidade">
            <Input
              value={form.cidadeNome}
              onChange={(e) =>
                setForm((f) => ({ ...f, cidadeNome: e.target.value }))
              }
              placeholder="Brasília"
              className="bg-muted/50 border-border text-foreground"
            />
          </Field>
          <Field label="UF">
            <Input
              value={form.uf}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  uf: e.target.value.toUpperCase().slice(0, 2),
                }))
              }
              className="bg-muted/50 border-border text-foreground"
            />
          </Field>
          <Field label="Inscrição Municipal">
            <Input
              value={form.inscricaoMunicipal}
              onChange={(e) =>
                setForm((f) => ({ ...f, inscricaoMunicipal: e.target.value }))
              }
              placeholder="Opcional"
              className="bg-muted/50 border-border text-foreground"
            />
          </Field>
        </div>

        {editOpen && (
          <div className="flex items-center justify-between rounded-lg bg-muted/30 border border-border px-4 py-3">
            <div className="flex items-center gap-2">
              {form.isActive ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-400" />
              )}
              <span className="text-sm text-foreground/80">
                {form.isActive ? "Ativo" : "Inativo"}
              </span>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, isActive: !!checked }))
              }
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/10 border border-violet-500/20">
            <Building2 className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Clientes MEI</h1>
            <p className="text-sm text-muted-foreground">
              Prestadores cujas notas são emitidas pela plataforma
            </p>
          </div>
        </div>
        <Button
          onClick={openCreate}
          className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer transition-all duration-200"
        >
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </motion.div>

      {/* Table */}
      <motion.div
        variants={itemVariants}
        className="rounded-xl border border-border bg-card/50 overflow-hidden overflow-x-auto"
      >
        {loading ? (
          <TableSkeleton />
        ) : clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Building2 className="h-12 w-12 mb-3 text-muted-foreground/60" />
            <p className="text-sm">Nenhum cliente cadastrado</p>
            <p className="text-xs mt-1">
              Cadastre o primeiro MEI pra começar a emitir notas
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">
                  Razão Social
                </TableHead>
                <TableHead className="text-muted-foreground">CNPJ</TableHead>
                <TableHead className="text-muted-foreground text-center hidden md:table-cell">
                  Certificado
                </TableHead>
                <TableHead className="text-muted-foreground text-center hidden sm:table-cell">
                  Notas
                </TableHead>
                <TableHead className="text-muted-foreground text-center hidden lg:table-cell">
                  Série / Último
                </TableHead>
                <TableHead className="text-muted-foreground text-center">
                  Status
                </TableHead>
                <TableHead className="text-muted-foreground text-center">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c, index) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: index * 0.03,
                    ease: "easeOut" as const,
                  }}
                  className="border-border hover:bg-accent/30 transition-colors duration-200"
                >
                  <TableCell className="font-medium text-foreground">
                    <Link
                      href={`/clientes/${c.id}`}
                      className="flex flex-col hover:text-violet-500 transition-colors"
                    >
                      <span>{c.razaoSocial}</span>
                      {c.nomeFantasia && (
                        <span className="text-xs text-muted-foreground">
                          {c.nomeFantasia}
                        </span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {formatCnpj(c.cnpj)}
                  </TableCell>
                  <TableCell className="text-center hidden md:table-cell">
                    <CertBadge
                      valido={c.certificadoValido}
                      expiraEm={c.certificadoExpiraEm}
                    />
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell text-muted-foreground">
                    {c.totalNfses}
                  </TableCell>
                  <TableCell className="text-center hidden lg:table-cell text-muted-foreground font-mono text-xs">
                    {c.serieDpsAtual} / {c.ultimoNumeroDps}
                  </TableCell>
                  <TableCell className="text-center">
                    {c.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Inativo
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(c)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(c)}
                        className="h-8 w-8 text-muted-foreground hover:text-red-400 cursor-pointer"
                        disabled={!c.isActive}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        )}
      </motion.div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Cliente MEI</DialogTitle>
            <DialogDescription>
              Cadastre um prestador MEI. O CNPJ pode ser preenchido
              automaticamente via BrasilAPI.
            </DialogDescription>
          </DialogHeader>
          {renderForm()}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitCreate}
              disabled={saving}
              className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente MEI</DialogTitle>
            <DialogDescription>
              Atualize os dados do prestador.
            </DialogDescription>
          </DialogHeader>
          {renderForm()}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitEdit}
              disabled={saving}
              className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              O cliente{" "}
              <strong className="text-foreground">
                {clienteToDelete?.razaoSocial}
              </strong>{" "}
              será marcado como inativo. O histórico de notas fiscais será
              preservado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Inativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
