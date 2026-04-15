"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateClienteMei, deleteClienteMei } from "@/lib/actions/clientes-mei";
import type { ClienteMeiDetail } from "@/lib/actions/clientes-mei";
import { toast } from "sonner";

interface EditEmpresaDialogProps {
  empresa: ClienteMeiDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditEmpresaDialog({
  empresa,
  open,
  onOpenChange,
  onSaved,
}: EditEmpresaDialogProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const inputClasses =
    "bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all duration-200";

  function handleSubmit(formData: FormData) {
    setError(null);

    const razaoSocial = formData.get("razaoSocial") as string;
    const nomeFantasia = formData.get("nomeFantasia") as string;
    const email = formData.get("email") as string;
    const telefone = formData.get("telefone") as string;
    const logoUrl = formData.get("logoUrl") as string;

    startTransition(async () => {
      const result = await updateClienteMei(empresa.id, {
        razaoSocial,
        nomeFantasia: nomeFantasia || undefined,
        email: email || undefined,
        telefone: telefone || undefined,
        logoUrl: logoUrl || undefined,
      });

      if (result.success) {
        onOpenChange(false);
        onSaved();
      } else {
        setError(result.error ?? "Erro desconhecido");
      }
    });
  }

  function handleToggleActive() {
    startTransition(async () => {
      const result = await updateClienteMei(empresa.id, {
        isActive: !empresa.isActive,
      });

      if (result.success) {
        onSaved();
      } else {
        setError(result.error ?? "Erro desconhecido");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteClienteMei(empresa.id);
      if (result.success) {
        toast.success("Empresa excluída");
        window.location.href = "/clientes";
      } else {
        toast.error(result.error || "Erro ao excluir");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Empresa</DialogTitle>
          <DialogDescription>
            Altere as informações da empresa.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-razaoSocial" className="text-foreground/80">
              Razão Social
            </Label>
            <Input
              id="edit-razaoSocial"
              name="razaoSocial"
              defaultValue={empresa.razaoSocial}
              required
              minLength={2}
              maxLength={200}
              className={inputClasses}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-nomeFantasia" className="text-foreground/80">
              Nome Fantasia
            </Label>
            <Input
              id="edit-nomeFantasia"
              name="nomeFantasia"
              defaultValue={empresa.nomeFantasia ?? ""}
              maxLength={200}
              placeholder="Opcional"
              className={inputClasses}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email" className="text-foreground/80">
              E-mail
            </Label>
            <Input
              id="edit-email"
              name="email"
              type="email"
              defaultValue={empresa.email ?? ""}
              placeholder="empresa@exemplo.com"
              className={inputClasses}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-telefone" className="text-foreground/80">
              Telefone
            </Label>
            <Input
              id="edit-telefone"
              name="telefone"
              defaultValue={empresa.telefone ?? ""}
              maxLength={20}
              placeholder="(11) 99999-9999"
              className={inputClasses}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-logoUrl" className="text-foreground/80">
              Logo URL
            </Label>
            <Input
              id="edit-logoUrl"
              name="logoUrl"
              type="url"
              defaultValue={empresa.logoUrl ?? ""}
              placeholder="https://exemplo.com/logo.png"
              className={inputClasses}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground cursor-pointer transition-all duration-200"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-violet-600 hover:bg-violet-700 text-white cursor-pointer transition-all duration-200"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </form>

        {/* Separator */}
        <div className="border-t border-border my-2" />

        {/* Ações de gestão */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleToggleActive}
            disabled={isPending}
            className={
              empresa.isActive
                ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 cursor-pointer transition-all duration-200"
                : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer transition-all duration-200"
            }
          >
            {empresa.isActive ? "Desativar Empresa" : "Reativar Empresa"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setDeleteOpen(true)}
            disabled={isPending}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer transition-all duration-200"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir Empresa
          </Button>
        </div>
      </DialogContent>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir empresa permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A empresa será desativada e todos
              os dados associados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-all duration-200">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 text-white cursor-pointer transition-all duration-200"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
