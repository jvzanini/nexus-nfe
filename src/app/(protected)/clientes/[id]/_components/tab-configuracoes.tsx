"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  Loader2,
  Save,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import {
  updateClienteMei,
  deleteClienteMei,
  fetchCnpjBrasilApi,
  type ClienteMeiDetail,
} from "@/lib/actions/clientes-mei";

interface TabConfiguracoesProps {
  empresa: ClienteMeiDetail;
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

export function TabConfiguracoes({ empresa }: TabConfiguracoesProps) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();
  const [fetchingCnpj, startFetchCnpj] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [form, setForm] = useState({
    cnpj: formatCnpj(empresa.cnpj),
    razaoSocial: empresa.razaoSocial,
    nomeFantasia: empresa.nomeFantasia ?? "",
    inscricaoMunicipal: empresa.inscricaoMunicipal ?? "",
    email: empresa.email ?? "",
    telefone: empresa.telefone ?? "",
    cep: formatCep(empresa.cep),
    logradouro: empresa.logradouro,
    numero: empresa.numero,
    complemento: empresa.complemento ?? "",
    bairro: empresa.bairro,
    municipioIbge: empresa.municipioIbge,
    uf: empresa.uf,
    isActive: empresa.isActive,
  });

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
        municipioIbge: String(d.codigo_municipio_ibge ?? f.municipioIbge),
        uf: d.uf ?? f.uf,
      }));
      toast.success("Dados carregados da Receita");
    });
  }

  function handleSave() {
    startSaving(async () => {
      const result = await updateClienteMei(empresa.id, {
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
        isActive: form.isActive,
      });
      if (result.success) {
        toast.success("Empresa atualizada");
        router.refresh();
      } else {
        toast.error(result.error || "Erro ao atualizar empresa");
      }
    });
  }

  function confirmDelete() {
    startDeleting(async () => {
      const result = await deleteClienteMei(empresa.id);
      if (result.success) {
        toast.success("Empresa inativada");
        router.push("/clientes");
      } else {
        toast.error(result.error || "Erro ao excluir empresa");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">
          Dados da Empresa
        </h2>

        {/* CNPJ */}
        <Field label="CNPJ">
          <div className="flex gap-2">
            <Input
              value={form.cnpj}
              onChange={(e) =>
                setForm((f) => ({ ...f, cnpj: formatCnpj(e.target.value) }))
              }
              placeholder="00.000.000/0000-00"
              className="bg-muted/50 border-border text-foreground"
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
        </Field>

        <Field label="Razão social">
          <Input
            value={form.razaoSocial}
            onChange={(e) =>
              setForm((f) => ({ ...f, razaoSocial: e.target.value }))
            }
            className="bg-muted/50 border-border text-foreground"
          />
        </Field>

        <Field label="Nome fantasia">
          <Input
            value={form.nomeFantasia}
            onChange={(e) =>
              setForm((f) => ({ ...f, nomeFantasia: e.target.value }))
            }
            className="bg-muted/50 border-border text-foreground"
          />
        </Field>

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

        <Field label="Bairro">
          <Input
            value={form.bairro}
            onChange={(e) =>
              setForm((f) => ({ ...f, bairro: e.target.value }))
            }
            className="bg-muted/50 border-border text-foreground"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_80px_1fr] gap-4">
          <Field label="Cód. IBGE Município">
            <Input
              value={form.municipioIbge}
              onChange={(e) =>
                setForm((f) => ({ ...f, municipioIbge: e.target.value }))
              }
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

        {/* Toggle ativo/inativo */}
        <div className="flex items-center justify-between rounded-lg bg-muted/30 border border-border px-4 py-3">
          <div className="flex items-center gap-2">
            {form.isActive ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-400" />
            )}
            <span className="text-sm text-foreground/80">
              {form.isActive ? "Ativa" : "Inativa"}
            </span>
          </div>
          <Switch
            checked={form.isActive}
            onCheckedChange={(checked) =>
              setForm((f) => ({ ...f, isActive: !!checked }))
            }
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar alterações
          </Button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 space-y-3">
        <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">
          Zona de perigo
        </h2>
        <p className="text-sm text-muted-foreground">
          Ao inativar a empresa, ela não poderá mais emitir notas fiscais. O
          histórico será preservado.
        </p>
        <Button
          variant="ghost"
          onClick={() => setDeleteOpen(true)}
          disabled={!empresa.isActive}
          className="gap-2 text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
          Inativar empresa
        </Button>
      </div>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              A empresa{" "}
              <strong className="text-foreground">{empresa.razaoSocial}</strong>{" "}
              será marcada como inativa. O histórico de notas fiscais será
              preservado.
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
              Inativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
