"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Loader2,
  Plus,
  Webhook,
  Pencil,
  Trash2,
  Copy,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
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
import { toast } from "sonner";
import {
  listarWebhooks,
  criarWebhook,
  atualizarWebhook,
  excluirWebhook,
  rotacionarSecret,
  WEBHOOK_EVENTS,
  type WebhookItem,
} from "@/lib/actions/webhooks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const EVENT_LABELS: Record<string, string> = {
  "nfse.autorizada": "NFS-e autorizada",
  "nfse.rejeitada": "NFS-e rejeitada",
  "nfse.cancelada": "NFS-e cancelada",
};

export function TabWebhooks({ empresaId }: { empresaId: string }) {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, startSaving] = useTransition();

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([...WEBHOOK_EVENTS]);
  const [secretGerado, setSecretGerado] = useState<string | null>(null);

  // Edit dialog
  const [editItem, setEditItem] = useState<WebhookItem | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editEvents, setEditEvents] = useState<string[]>([]);
  const [editActive, setEditActive] = useState(true);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    const result = await listarWebhooks(empresaId);
    if (result.success && result.data) setWebhooks(result.data);
    else if (result.error) toast.error(result.error);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [empresaId]);

  function toggleEvent(
    list: string[],
    set: (next: string[]) => void,
    ev: string
  ) {
    if (list.includes(ev)) set(list.filter((e) => e !== ev));
    else set([...list, ev]);
  }

  function handleCreate() {
    if (!url.trim()) {
      toast.error("Informe a URL");
      return;
    }
    startSaving(async () => {
      const result = await criarWebhook({
        clienteMeiId: empresaId,
        url: url.trim(),
        events,
      });
      if (result.success && result.data) {
        setSecretGerado(result.data.secret);
        setUrl("");
        await load();
      } else {
        toast.error(result.error || "Erro ao criar webhook");
      }
    });
  }

  function handleUpdate() {
    if (!editItem) return;
    startSaving(async () => {
      const result = await atualizarWebhook(editItem.id, {
        url: editUrl.trim(),
        events: editEvents,
        isActive: editActive,
      });
      if (result.success) {
        toast.success("Webhook atualizado");
        setEditItem(null);
        await load();
      } else {
        toast.error(result.error || "Erro ao atualizar webhook");
      }
    });
  }

  function handleDelete() {
    if (!deleteId) return;
    startSaving(async () => {
      const result = await excluirWebhook(deleteId);
      if (result.success) {
        toast.success("Webhook removido");
        setDeleteId(null);
        await load();
      } else {
        toast.error(result.error || "Erro ao excluir webhook");
      }
    });
  }

  function handleRotate(id: string) {
    startSaving(async () => {
      const result = await rotacionarSecret(id);
      if (result.success && result.data) {
        setSecretGerado(result.data.secret);
        await load();
      } else {
        toast.error(result.error || "Erro ao rotacionar secret");
      }
    });
  }

  function copyToClipboard(value: string) {
    void navigator.clipboard.writeText(value);
    toast.success("Copiado para a área de transferência");
  }

  function openEdit(w: WebhookItem) {
    setEditItem(w);
    setEditUrl(w.url);
    setEditEvents(w.events);
    setEditActive(w.isActive);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
        <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Webhook className="size-5 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground/80">
            {webhooks.length} {webhooks.length === 1 ? "webhook" : "webhooks"}
          </h3>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEvents([...WEBHOOK_EVENTS]);
            setUrl("");
            setCreateOpen(true);
          }}
          className="gap-2 cursor-pointer bg-violet-600 hover:bg-violet-700 text-white"
        >
          <Plus className="h-4 w-4" />
          Novo Webhook
        </Button>
      </div>

      {/* Empty state */}
      {webhooks.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/50 p-12 text-center text-muted-foreground">
          <Webhook className="size-10 mx-auto mb-3 text-muted-foreground/60" />
          <p className="text-sm">Nenhum webhook cadastrado</p>
          <p className="text-xs mt-1">
            Receba eventos de emissão, rejeição e cancelamento em sua URL.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card/50 overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs uppercase text-muted-foreground font-medium">URL</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground font-medium">Eventos</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground font-medium">Status</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground font-medium">Última tentativa</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground font-medium text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((w) => (
                <TableRow key={w.id} className="hover:bg-accent/30 transition-colors">
                  <TableCell className="text-foreground text-sm font-mono truncate max-w-xs">
                    {w.url}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {w.events.map((e) => EVENT_LABELS[e] ?? e).join(", ")}
                  </TableCell>
                  <TableCell>
                    {!w.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-500/30 bg-zinc-500/10 px-2 py-0.5 text-[11px] text-zinc-400">
                        Inativo
                      </span>
                    ) : w.lastStatus === "success" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        OK
                      </span>
                    ) : w.lastStatus === "error" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-400">
                        <AlertCircle className="h-3 w-3" />
                        Falha ({w.failureCount})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        Nunca executado
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {w.lastAttemptAt
                      ? format(w.lastAttemptAt, "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleRotate(w.id)}
                        disabled={saving}
                        className="cursor-pointer text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                        title="Rotacionar secret"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => openEdit(w)}
                        className="cursor-pointer text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(w.id)}
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
        </div>
      )}

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setSecretGerado(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {secretGerado ? "Webhook criado" : "Novo webhook"}
            </DialogTitle>
            {!secretGerado && (
              <DialogDescription>
                Informe a URL que receberá os eventos. Você receberá o secret uma única vez.
              </DialogDescription>
            )}
          </DialogHeader>

          {secretGerado ? (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Guarde este secret agora — não será exibido novamente. Ele é usado para validar
                a assinatura HMAC-SHA256 enviada no header <code className="text-xs">X-Nexus-Signature</code>.
              </p>
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3 font-mono text-xs break-all">
                <span className="flex-1">{secretGerado}</span>
                <button
                  onClick={() => copyToClipboard(secretGerado)}
                  className="cursor-pointer p-1 rounded hover:bg-accent"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <DialogFooter>
                <Button
                  size="sm"
                  onClick={() => {
                    setCreateOpen(false);
                    setSecretGerado(null);
                  }}
                  className="bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
                >
                  Entendi, guardei
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">URL do endpoint</Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://sua-api.com/webhooks/nexus"
                  className="bg-muted/50 border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">Eventos</Label>
                <div className="space-y-1.5">
                  {WEBHOOK_EVENTS.map((ev) => (
                    <label key={ev} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={events.includes(ev)}
                        onChange={() => toggleEvent(events, setEvents, ev)}
                        className="accent-violet-600"
                      />
                      <span className="text-sm text-foreground/90">{EVENT_LABELS[ev]}</span>
                    </label>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateOpen(false)}
                  disabled={saving}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={saving}
                  className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Criar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">URL</Label>
              <Input
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                className="bg-muted/50 border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">Eventos</Label>
              <div className="space-y-1.5">
                {WEBHOOK_EVENTS.map((ev) => (
                  <label key={ev} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editEvents.includes(ev)}
                      onChange={() => toggleEvent(editEvents, setEditEvents, ev)}
                      className="accent-violet-600"
                    />
                    <span className="text-sm text-foreground/90">{EVENT_LABELS[ev]}</span>
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="accent-violet-600"
              />
              <span className="text-sm text-foreground/90">Ativo</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditItem(null)} disabled={saving} className="cursor-pointer">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleUpdate} disabled={saving} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              Nenhum evento futuro será enviado para esta URL. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
