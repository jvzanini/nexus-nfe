"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Plus, Trash2, Users, ChevronUp, Search, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  listarTomadoresFavoritos,
  excluirTomadorFavorito,
  salvarTomadorFavorito,
  atualizarTomadorFavorito,
  type TomadorFavoritoItem,
} from "@/lib/actions/tomadores-favoritos";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TabTomadoresProps {
  empresaId: string;
}

function formatCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatCnpj(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatDocumento(doc: string) {
  const clean = doc.replace(/\D/g, "");
  if (clean.length <= 11) return formatCpf(clean);
  return formatCnpj(clean);
}

export function TabTomadores({ empresaId }: TabTomadoresProps) {
  const [tomadores, setTomadores] = useState<TomadorFavoritoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, startDeleting] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Form novo tomador
  const [showForm, setShowForm] = useState(false);
  const [saving, startSaving] = useTransition();
  const [formTipo, setFormTipo] = useState<"cpf" | "cnpj">("cpf");
  const [formDoc, setFormDoc] = useState("");
  const [formNome, setFormNome] = useState("");
  const [formEmail, setFormEmail] = useState("");

  // Edit dialog
  const [editItem, setEditItem] = useState<TomadorFavoritoItem | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSaving, startEditSaving] = useTransition();

  async function load() {
    const result = await listarTomadoresFavoritos(empresaId);
    if (result.success && result.data) {
      setTomadores(result.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [empresaId]);

  function resetForm() {
    setFormTipo("cpf");
    setFormDoc("");
    setFormNome("");
    setFormEmail("");
    setShowForm(false);
  }

  function handleDocChange(value: string) {
    setFormDoc(formTipo === "cpf" ? formatCpf(value) : formatCnpj(value));
  }

  function handleTipoChange(newTipo: "cpf" | "cnpj") {
    setFormTipo(newTipo);
    setFormDoc("");
  }

  function handleSave() {
    const docClean = formDoc.replace(/\D/g, "");
    if (formTipo === "cpf" && docClean.length !== 11) {
      toast.error("CPF deve ter 11 dígitos");
      return;
    }
    if (formTipo === "cnpj" && docClean.length !== 14) {
      toast.error("CNPJ deve ter 14 dígitos");
      return;
    }
    if (!formNome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    startSaving(async () => {
      const result = await salvarTomadorFavorito({
        clienteMeiId: empresaId,
        tipo: formTipo,
        documento: docClean,
        nome: formNome.trim(),
        email: formEmail.trim() || undefined,
      });
      if (result.success) {
        toast.success("Tomador salvo com sucesso");
        resetForm();
        await load();
      } else {
        toast.error(result.error || "Erro ao salvar tomador");
      }
    });
  }

  function confirmDelete() {
    if (!deleteId) return;
    startDeleting(async () => {
      const result = await excluirTomadorFavorito(deleteId);
      if (result.success) {
        toast.success("Tomador removido");
        setDeleteId(null);
        await load();
      } else {
        toast.error(result.error || "Erro ao remover tomador");
      }
    });
  }

  function openEdit(t: TomadorFavoritoItem) {
    setEditItem(t);
    setEditNome(t.nome);
    setEditEmail(t.email || "");
  }

  function handleEditSave() {
    if (!editItem) return;
    if (!editNome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    startEditSaving(async () => {
      const result = await atualizarTomadorFavorito(editItem.id, {
        nome: editNome.trim(),
        email: editEmail.trim() || undefined,
      });
      if (result.success) {
        toast.success("Tomador atualizado");
        setEditItem(null);
        await load();
      } else {
        toast.error(result.error || "Erro ao atualizar tomador");
      }
    });
  }

  const filtered = tomadores.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.nome.toLowerCase().includes(q) ||
      t.documento.includes(q) ||
      (t.email && t.email.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
        <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  const formSection = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground/80">
            {tomadores.length} {tomadores.length === 1 ? "tomador" : "tomadores"}
          </h3>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="gap-2 cursor-pointer bg-violet-600 hover:bg-violet-700 text-white"
        >
          {showForm ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Novo Tomador
        </Button>
      </div>

      {/* Form colapsavel */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          {/* Tipo de documento */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              Tipo de Documento
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={formTipo === "cpf" ? "default" : "outline"}
                onClick={() => handleTipoChange("cpf")}
                size="sm"
                className={`flex-1 cursor-pointer ${
                  formTipo === "cpf"
                    ? "bg-violet-600 hover:bg-violet-700 text-white"
                    : ""
                }`}
              >
                CPF
              </Button>
              <Button
                type="button"
                variant={formTipo === "cnpj" ? "default" : "outline"}
                onClick={() => handleTipoChange("cnpj")}
                size="sm"
                className={`flex-1 cursor-pointer ${
                  formTipo === "cnpj"
                    ? "bg-violet-600 hover:bg-violet-700 text-white"
                    : ""
                }`}
              >
                CNPJ
              </Button>
            </div>
          </div>

          {/* Documento */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              {formTipo === "cpf" ? "CPF" : "CNPJ"} <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formDoc}
              onChange={(e) => handleDocChange(e.target.value)}
              placeholder={formTipo === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
              className="bg-muted/50 border-border text-foreground font-mono"
            />
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              Nome / Razão Social <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formNome}
              onChange={(e) => setFormNome(e.target.value)}
              placeholder="Nome completo ou razão social"
              className="bg-muted/50 border-border text-foreground"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              E-mail (opcional)
            </Label>
            <Input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="bg-muted/50 border-border text-foreground"
            />
          </div>

          {/* Acoes */}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={resetForm}
              disabled={saving}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-4">
      {formSection}

      {/* Busca */}
      {tomadores.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tomador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Tabela ou empty state */}
      <div className="rounded-xl border border-border bg-card/50 overflow-hidden overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="size-10 mb-3 text-muted-foreground/60" />
            <p className="text-sm">
              {tomadores.length === 0
                ? "Nenhum tomador favorito"
                : "Nenhum tomador encontrado"}
            </p>
            {tomadores.length === 0 && (
              <p className="text-xs mt-1">
                Tomadores são salvos automaticamente ao emitir uma NFS-e
              </p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs uppercase text-muted-foreground font-medium">Nome</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground font-medium">Documento</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground font-medium">E-mail</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground font-medium text-center">Usos</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground font-medium">Último uso</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground font-medium text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow
                  key={t.id}
                  className="hover:bg-accent/30 transition-colors"
                >
                  <TableCell className="text-foreground font-medium">
                    {t.nome}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {formatDocumento(t.documento)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.email || "\u2014"}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground tabular-nums">
                    {t.usoCount}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {t.ultimoUso
                      ? format(t.ultimoUso, "dd/MM/yyyy", { locale: ptBR })
                      : "\u2014"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(t)}
                        className="cursor-pointer text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(t.id)}
                        className="cursor-pointer text-muted-foreground hover:text-red-400 p-1 rounded transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar tomador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">Nome / Razão Social</Label>
              <Input
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                className="bg-muted/50 border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">E-mail</Label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="bg-muted/50 border-border text-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditItem(null)} disabled={editSaving} className="cursor-pointer">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleEditSave} disabled={editSaving} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer">
              {editSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover tomador favorito?</AlertDialogTitle>
            <AlertDialogDescription>
              O tomador será removido da lista de favoritos. Ele poderá ser
              adicionado novamente ao emitir uma nova NFS-e.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
