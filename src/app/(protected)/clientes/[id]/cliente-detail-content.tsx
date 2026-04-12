"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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
  ArrowLeft,
  Building2,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Upload,
  Eye,
  EyeOff,
  Loader2,
  Receipt,
  Calendar,
  MapPin,
  Mail,
  Phone,
  FileDigit,
  Trash2,
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
import { useRouter } from "next/navigation";

function formatCnpj(v: string) {
  const d = v.replace(/\D/g, "");
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatCep(v: string) {
  const d = v.replace(/\D/g, "");
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
}

interface Props {
  cliente: ClienteMeiDetail;
  certificados: CertificadoListItem[];
}

export function ClienteDetailContent({
  cliente,
  certificados,
}: Props) {
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
        clienteMeiId: cliente.id,
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

  const now = new Date();
  const certStatus = (() => {
    if (!ativo) return { label: "Sem certificado", variant: "none" as const };
    const dias = differenceInDays(ativo.notAfter, now);
    if (dias < 0) return { label: "Expirado", variant: "error" as const };
    if (dias <= 30)
      return { label: `Expira em ${dias}d`, variant: "warning" as const };
    return { label: "Válido", variant: "ok" as const };
  })();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/clientes">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/10 border border-violet-500/20">
          <Building2 className="h-5 w-5 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">
            {cliente.razaoSocial}
          </h1>
          <p className="text-sm text-muted-foreground font-mono">
            {formatCnpj(cliente.cnpj)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {cliente.isActive ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Ativo
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Inativo
            </span>
          )}
        </div>
      </div>

      {/* Grid principal: dados + cert */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dados do cliente */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card/50 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">
            Dados Cadastrais
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {cliente.nomeFantasia && (
              <InfoRow label="Nome Fantasia" value={cliente.nomeFantasia} />
            )}
            {cliente.inscricaoMunicipal && (
              <InfoRow
                label="Inscrição Municipal"
                value={cliente.inscricaoMunicipal}
              />
            )}
            {cliente.email && (
              <InfoRow
                icon={<Mail className="h-3.5 w-3.5" />}
                label="E-mail"
                value={cliente.email}
              />
            )}
            {cliente.telefone && (
              <InfoRow
                icon={<Phone className="h-3.5 w-3.5" />}
                label="Telefone"
                value={cliente.telefone}
              />
            )}
            <InfoRow
              icon={<MapPin className="h-3.5 w-3.5" />}
              label="Endereço"
              value={`${cliente.logradouro}, ${cliente.numero}${cliente.complemento ? ` - ${cliente.complemento}` : ""}`}
            />
            <InfoRow
              label="Bairro / CEP"
              value={`${cliente.bairro} — ${formatCep(cliente.cep)}`}
            />
            <InfoRow
              label="Município / UF"
              value={`${cliente.municipioIbge} — ${cliente.uf}`}
            />
            {cliente.codigoServicoPadrao && (
              <InfoRow
                label="Cód. serviço padrão"
                value={cliente.codigoServicoPadrao}
              />
            )}
            <InfoRow
              icon={<FileDigit className="h-3.5 w-3.5" />}
              label="Série / Último DPS"
              value={`${cliente.serieDpsAtual} / ${cliente.ultimoNumeroDps}`}
            />
            <InfoRow
              icon={<Receipt className="h-3.5 w-3.5" />}
              label="NFS-e emitidas"
              value={String(cliente.totalNfses)}
            />
            <InfoRow
              icon={<Calendar className="h-3.5 w-3.5" />}
              label="Cadastrado em"
              value={format(cliente.createdAt, "dd/MM/yyyy HH:mm", {
                locale: ptBR,
              })}
            />
          </div>
        </div>

        {/* Certificado Digital */}
        <div className="rounded-xl border border-border bg-card/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">
              Certificado Digital
            </h2>
            <Button
              size="sm"
              onClick={openUpload}
              className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Upload className="h-3.5 w-3.5" />
              {ativo ? "Substituir" : "Enviar"}
            </Button>
          </div>

          {ativo ? (
            <div className="space-y-3">
              <div
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                  certStatus.variant === "ok"
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : certStatus.variant === "warning"
                    ? "border-amber-500/30 bg-amber-500/10"
                    : "border-red-500/30 bg-red-500/10"
                }`}
              >
                {certStatus.variant === "ok" ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                ) : certStatus.variant === "warning" ? (
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                ) : (
                  <ShieldOff className="h-4 w-4 text-red-500" />
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

              <div className="space-y-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Common Name</p>
                  <p className="text-foreground font-mono break-all">
                    {ativo.commonName}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Thumbprint</p>
                  <p className="text-foreground font-mono break-all">
                    {ativo.thumbprint}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-muted-foreground">Válido desde</p>
                    <p className="text-foreground">
                      {format(ativo.notBefore, "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expira em</p>
                    <p className="text-foreground">
                      {format(ativo.notAfter, "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Arquivo</p>
                  <p className="text-foreground truncate">{ativo.nomeArquivo}</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRevoke(ativo.id)}
                className="w-full gap-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
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
      </div>

      {/* Histórico de certificados */}
      {historico.length > 0 && (
        <div className="rounded-xl border border-border bg-card/50 p-6 space-y-3">
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
              Arquivo .pfx/.p12 A1 do CNPJ {formatCnpj(cliente.cnpj)}. O arquivo
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
    </motion.div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-muted-foreground text-xs uppercase tracking-wide">
        {icon}
        {label}
      </p>
      <p className="text-foreground mt-0.5 break-words">{value}</p>
    </div>
  );
}
