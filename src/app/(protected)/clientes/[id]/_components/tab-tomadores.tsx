"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Plus, Trash2, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import {
  listarTomadoresFavoritos,
  excluirTomadorFavorito,
  salvarTomadorFavorito,
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

export function TabTomadores({ empresaId }: TabTomadoresProps) {
  const [tomadores, setTomadores] = useState<TomadorFavoritoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, startDeleting] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form novo tomador
  const [showForm, setShowForm] = useState(false);
  const [saving, startSaving] = useTransition();
  const [formTipo, setFormTipo] = useState<"cpf" | "cnpj">("cpf");
  const [formDoc, setFormDoc] = useState("");
  const [formNome, setFormNome] = useState("");
  const [formEmail, setFormEmail] = useState("");

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  const formSection = (
    <>
      {/* Header com botão */}
      <div className="flex items-center justify-between">
        <div />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="gap-2 cursor-pointer"
        >
          {showForm ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Novo Tomador
        </Button>
      </div>

      {/* Form colapsável */}
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

          {/* Ações */}
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

  if (tomadores.length === 0) {
    return (
      <div className="space-y-4">
        {formSection}
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground rounded-xl border border-border bg-card">
          <Users className="h-12 w-12 mb-3 text-muted-foreground/60" />
          <p className="text-sm">Nenhum tomador favorito</p>
          <p className="text-xs mt-1">
            Tomadores são salvos automaticamente ao emitir uma NFS-e
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {formSection}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Nome
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Documento
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  E-mail
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Usos
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Último uso
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {tomadores.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3 text-foreground font-medium">
                    {t.nome}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {t.documento}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {t.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground tabular-nums">
                    {t.usoCount}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {t.ultimoUso
                      ? format(t.ultimoUso, "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteId(t.id)}
                      className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
