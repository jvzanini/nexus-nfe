"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Upload,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  uploadCertificado,
  revokeCertificado,
  type CertificadoListItem,
} from "@/lib/actions/certificados";
import type { ClienteMeiDetail } from "@/lib/actions/clientes-mei";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatCnpj(v: string) {
  const d = v.replace(/\D/g, "");
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

interface TabCertificadoProps {
  empresa: ClienteMeiDetail;
  certificados: CertificadoListItem[];
}

export function TabCertificado({ empresa, certificados }: TabCertificadoProps) {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [saving, startSaving] = useTransition();
  const [revoking, startRevoking] = useTransition();
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ativo = certificados.find((c) => !c.revoked) ?? null;
  const historico = certificados.filter((c) => c.id !== ativo?.id);

  const now = new Date();
  const certStatus = (() => {
    if (!ativo) return { label: "Sem certificado", variant: "none" as const };
    const dias = differenceInDays(ativo.notAfter, now);
    if (dias < 0) return { label: "Expirado", variant: "error" as const };
    if (dias <= 30)
      return { label: `Expira em ${dias}d`, variant: "warning" as const };
    return { label: "Válido", variant: "ok" as const };
  })();

  function openUpload() {
    setFile(null);
    setSenha("");
    setShowSenha(false);
    setUploadOpen(true);
  }

  async function handleUploadSubmit() {
    if (!file || !senha.trim()) {
      toast.error("Selecione um arquivo .pfx e informe a senha");
      return;
    }
    if (
      !file.name.toLowerCase().endsWith(".pfx") &&
      !file.name.toLowerCase().endsWith(".p12")
    ) {
      toast.error("Apenas arquivos .pfx ou .p12 são aceitos");
      return;
    }
    if (file.size > 512 * 1024) {
      toast.error("Arquivo muito grande (máx 512KB)");
      return;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pfxBase64 = Buffer.from(arrayBuffer).toString("base64");

    startSaving(async () => {
      const result = await uploadCertificado({
        clienteMeiId: empresa.id,
        nomeArquivo: file.name,
        pfxBase64,
        senha,
      });
      if (result.success) {
        toast.success("Certificado enviado com sucesso");
        setUploadOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || "Erro ao enviar certificado");
      }
    });
  }

  function handleRevoke(id: string) {
    setRevokeId(id);
  }

  function confirmRevoke() {
    if (!revokeId) return;
    startRevoking(async () => {
      const result = await revokeCertificado(revokeId);
      if (result.success) {
        toast.success("Certificado revogado");
        setRevokeId(null);
        router.refresh();
      } else {
        toast.error(result.error || "Erro ao revogar certificado");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Security warning */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10">
            <ShieldCheck className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Certificado Digital A1
            </p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
              O arquivo .pfx é cifrado com AES-256-GCM antes de ser armazenado.
              A chave privada nunca sai do servidor.
            </p>
          </div>
        </div>
      </div>

      {/* Certificate status card */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">
            Status do Certificado
          </h2>
          <Button
            size="sm"
            onClick={openUpload}
            className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            {ativo ? "Substituir" : "Enviar"}
          </Button>
        </div>

        {ativo ? (
          <div className="space-y-4">
            {/* Status banner */}
            <div
              className={`flex items-center gap-2 rounded-lg border px-4 py-3 ${
                certStatus.variant === "ok"
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : certStatus.variant === "warning"
                  ? "border-amber-500/30 bg-amber-500/10"
                  : "border-red-500/30 bg-red-500/10"
              }`}
            >
              {certStatus.variant === "ok" ? (
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
              ) : certStatus.variant === "warning" ? (
                <ShieldAlert className="h-5 w-5 text-amber-500" />
              ) : (
                <ShieldOff className="h-5 w-5 text-red-500" />
              )}
              <span
                className={`text-sm font-medium ${
                  certStatus.variant === "ok"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : certStatus.variant === "warning"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {certStatus.label}
              </span>
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Common Name</p>
                <p className="text-foreground font-mono break-all mt-0.5">
                  {ativo.commonName}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Thumbprint</p>
                <p className="text-foreground font-mono break-all mt-0.5">
                  {ativo.thumbprint}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Válido desde</p>
                <p className="text-foreground mt-0.5">
                  {format(ativo.notBefore, "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expira em</p>
                <p className="text-foreground mt-0.5">
                  {format(ativo.notAfter, "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Arquivo</p>
                <p className="text-foreground truncate mt-0.5">{ativo.nomeArquivo}</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRevoke(ativo.id)}
              className="w-full gap-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Revogar certificado
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ShieldOff className="h-10 w-10 mb-3 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              Nenhum certificado ativo
            </p>
            <p className="text-xs text-muted-foreground/80 mt-1">
              Necessário pra assinar e emitir NFS-e
            </p>
          </div>
        )}
      </div>

      {/* History */}
      {historico.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <h2 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">
            Histórico de certificados ({historico.length})
          </h2>
          <div className="space-y-2">
            {historico.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-foreground truncate font-medium">
                    {c.nomeArquivo}
                  </p>
                  <p className="text-muted-foreground font-mono">
                    {c.thumbprint.slice(0, 20)}… — expirou/revogado em{" "}
                    {format(c.notAfter, "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {c.revoked ? "Revogado" : "Expirado"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar certificado digital</DialogTitle>
            <DialogDescription>
              Arquivo .pfx/.p12 A1 do CNPJ {formatCnpj(empresa.cnpj)}. O arquivo
              é cifrado com AES-256-GCM antes de ser armazenado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                Arquivo (.pfx / .p12)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pfx,.p12"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-violet-600 file:text-white hover:file:bg-violet-700 file:cursor-pointer cursor-pointer"
              />
              {file && (
                <p className="mt-1.5 text-xs text-muted-foreground truncate">
                  {file.name} — {(file.size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                Senha do certificado
              </label>
              <div className="relative">
                <Input
                  type={showSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="bg-muted/50 border-border text-foreground pr-10"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showSenha ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUploadSubmit}
              disabled={saving || !file || !senha.trim()}
              className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirm */}
      <AlertDialog
        open={!!revokeId}
        onOpenChange={(open) => !open && setRevokeId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar certificado?</AlertDialogTitle>
            <AlertDialogDescription>
              O certificado será marcado como revogado e não poderá mais ser
              usado pra emitir notas. Você precisará fazer upload de outro
              antes da próxima emissão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevoke}
              disabled={revoking}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {revoking && <Loader2 className="h-4 w-4 animate-spin" />}
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
