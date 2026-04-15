"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Key, Plus, Trash2, Copy, Loader2, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  listApiKeys,
  criarApiKey,
  revogarApiKey,
  type MaskedApiKey,
} from "@/lib/actions/api-keys";

export function ApiKeysSection() {
  const [keys, setKeys] = useState<MaskedApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, startSaving] = useTransition();

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [keyGerada, setKeyGerada] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  // Revoke
  const [revokeTarget, setRevokeTarget] = useState<MaskedApiKey | null>(null);

  const load = useCallback(async () => {
    const result = await listApiKeys();
    if (result.success && result.data) setKeys(result.data);
    else if (result.error) toast.error(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetCreate() {
    setCreateOpen(false);
    setName("");
    setKeyGerada(null);
    setShowKey(false);
  }

  function handleCreate() {
    if (!name.trim()) {
      toast.error("Informe um nome");
      return;
    }
    startSaving(async () => {
      const result = await criarApiKey(name);
      if (result.success && result.data) {
        setKeyGerada(result.data.key);
        setShowKey(true);
        await load();
      } else {
        toast.error(result.error || "Erro ao criar API key");
      }
    });
  }

  function handleRevoke() {
    if (!revokeTarget) return;
    startSaving(async () => {
      const result = await revogarApiKey(revokeTarget.preview);
      if (result.success) {
        toast.success("API key revogada");
        setRevokeTarget(null);
        await load();
      } else {
        toast.error(result.error || "Erro ao revogar API key");
      }
    });
  }

  function copyToClipboard(value: string) {
    void navigator.clipboard.writeText(value);
    toast.success("Copiado para a área de transferência");
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" as const },
    },
  };

  return (
    <motion.div variants={itemVariants}>
      <Card className="border-border bg-card/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground text-base">
              <Key className="h-4 w-4 text-muted-foreground" />
              API Keys
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="gap-2 cursor-pointer bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Plus className="h-4 w-4" />
              Nova API Key
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Chaves para acesso à API REST v1. Envie no header{" "}
            <code className="text-[11px]">X-API-Key</code>.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-24 bg-muted/30 rounded-lg animate-pulse" />
          ) : keys.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              <Key className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              Nenhuma API key criada
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-xs uppercase text-muted-foreground font-medium">
                      Nome
                    </TableHead>
                    <TableHead className="text-xs uppercase text-muted-foreground font-medium">
                      Chave
                    </TableHead>
                    <TableHead className="text-xs uppercase text-muted-foreground font-medium">
                      Criada em
                    </TableHead>
                    <TableHead className="text-xs uppercase text-muted-foreground font-medium">
                      Por
                    </TableHead>
                    <TableHead className="text-xs uppercase text-muted-foreground font-medium text-right">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((k) => (
                    <TableRow key={k.preview} className="hover:bg-accent/30 transition-colors">
                      <TableCell className="text-foreground text-sm">{k.name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">
                        {k.preview}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(k.createdAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {k.createdBy ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => setRevokeTarget(k)}
                          className="cursor-pointer text-muted-foreground hover:text-red-400 p-1 rounded transition-colors"
                          title="Revogar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => !open && resetCreate()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {keyGerada ? "API Key criada" : "Nova API Key"}
            </DialogTitle>
            {!keyGerada && (
              <DialogDescription>
                A chave será exibida uma única vez após a criação. Guarde em um cofre seguro.
              </DialogDescription>
            )}
          </DialogHeader>

          {keyGerada ? (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Guarde esta chave agora — não será exibida novamente.
              </p>
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3 font-mono text-xs break-all">
                <span className="flex-1">
                  {showKey ? keyGerada : keyGerada.slice(0, 10) + "•".repeat(20)}
                </span>
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="cursor-pointer p-1 rounded hover:bg-accent"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => copyToClipboard(keyGerada)}
                  className="cursor-pointer p-1 rounded hover:bg-accent"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <DialogFooter>
                <Button
                  size="sm"
                  onClick={resetCreate}
                  className="bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
                >
                  Entendi, guardei
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  Nome da chave
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Integração ERP"
                  className="bg-muted/50 border-border text-foreground"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetCreate}
                  disabled={saving}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={saving || !name.trim()}
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

      {/* Revoke confirm */}
      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              A chave &quot;{revokeTarget?.name}&quot; deixará de funcionar imediatamente. Qualquer
              integração usando essa chave precisará ser reconfigurada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
