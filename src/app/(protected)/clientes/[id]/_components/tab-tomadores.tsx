"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  type TomadorFavoritoItem,
} from "@/lib/actions/tomadores-favoritos";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TabTomadoresProps {
  empresaId: string;
}

export function TabTomadores({ empresaId }: TabTomadoresProps) {
  const [tomadores, setTomadores] = useState<TomadorFavoritoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, startDeleting] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  if (tomadores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground rounded-xl border border-border bg-card">
        <Users className="h-12 w-12 mb-3 text-muted-foreground/60" />
        <p className="text-sm">Nenhum tomador favorito</p>
        <p className="text-xs mt-1">
          Tomadores são salvos automaticamente ao emitir uma NFS-e
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
