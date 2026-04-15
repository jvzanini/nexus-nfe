"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { ShieldCheck, Loader2, Copy, Download, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  status2fa,
  iniciarSetup2fa,
  confirmarSetup2fa,
  desativar2fa,
} from "@/lib/actions/two-factor";

export function TwoFactorCard() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupOpen, setSetupOpen] = useState(false);
  const [desativarOpen, setDesativarOpen] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [senha, setSenha] = useState("");
  const [tokenDes, setTokenDes] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    const r = await status2fa();
    setEnabled(r.success && r.data ? r.data.enabled : false);
    setLoading(false);
  }

  function iniciar() {
    startTransition(async () => {
      const r = await iniciarSetup2fa();
      if (!r.success || !r.data) {
        toast.error(r.error ?? "Erro");
        return;
      }
      setQr(r.data.qrDataUrl);
      setSecret(r.data.secret);
      setSetupOpen(true);
    });
  }

  function confirmar() {
    startTransition(async () => {
      const r = await confirmarSetup2fa(token);
      if (!r.success || !r.data) {
        toast.error(r.error ?? "Erro");
        return;
      }
      setBackupCodes(r.data.backupCodes);
      setQr(null);
      setSecret(null);
      setToken("");
      setEnabled(true);
      toast.success("2FA ativado");
    });
  }

  function desativar() {
    startTransition(async () => {
      const r = await desativar2fa(senha, tokenDes);
      if (!r.success) {
        toast.error(r.error ?? "Erro");
        return;
      }
      setSenha("");
      setTokenDes("");
      setDesativarOpen(false);
      setEnabled(false);
      toast.success("2FA desativado");
    });
  }

  function baixarBackup() {
    if (!backupCodes) return;
    const txt =
      "Nexus NFE — Backup Codes 2FA\n\nGuarde estes códigos em local seguro.\nCada código pode ser usado 1 vez caso você perca o aplicativo autenticador.\n\n" +
      backupCodes.join("\n");
    const blob = new Blob([txt], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "nexus-nfe-backup-codes.txt";
    a.click();
  }

  return (
    <Card className="border-border bg-card/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-foreground text-base">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          Autenticação em 2 fatores
          {enabled && (
            <Badge
              variant="outline"
              className="ml-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >
              Ativo
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Protege sua conta exigindo um código de 6 dígitos do aplicativo
          autenticador (Google Authenticator, Authy, 1Password) no login.
        </p>

        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : !enabled && !setupOpen && !backupCodes ? (
          <Button
            onClick={iniciar}
            disabled={isPending}
            className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4" /> Ativar 2FA
          </Button>
        ) : null}

        {setupOpen && qr && secret && (
          <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-sm">
              1. Escaneie o QR code abaixo no seu app autenticador:
            </p>
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-white p-2">
                <Image src={qr} alt="QR 2FA" width={180} height={180} />
              </div>
              <div className="space-y-2">
                <Label>Ou digite este código manualmente:</Label>
                <div className="flex gap-2">
                  <code className="rounded bg-muted px-2 py-1 text-xs font-mono break-all">
                    {secret}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(secret);
                      toast.success("Copiado");
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label>2. Digite o código que apareceu no app:</Label>
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="max-w-[160px] font-mono text-center tracking-widest"
              />
            </div>
            <Button
              onClick={confirmar}
              disabled={isPending || token.length < 6}
              className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Ativar 2FA
            </Button>
          </div>
        )}

        {backupCodes && (
          <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              Guarde estes códigos de backup — eles não aparecerão novamente!
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {backupCodes.map((c) => (
                <code key={c} className="rounded bg-background/50 px-2 py-1">
                  {c}
                </code>
              ))}
            </div>
            <Button onClick={baixarBackup} variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Baixar códigos (.txt)
            </Button>
          </div>
        )}

        {enabled && !setupOpen && !backupCodes && (
          <div className="space-y-3">
            {!desativarOpen ? (
              <Button
                variant="outline"
                onClick={() => setDesativarOpen(true)}
                className="gap-2 cursor-pointer text-red-500 hover:text-red-600"
              >
                <ShieldOff className="h-4 w-4" /> Desativar 2FA
              </Button>
            ) : (
              <div className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                <p className="text-sm text-red-600 dark:text-red-400">
                  Para desativar, confirme sua senha e o código TOTP atual.
                </p>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Código TOTP</Label>
                  <Input
                    value={tokenDes}
                    onChange={(e) => setTokenDes(e.target.value)}
                    maxLength={6}
                    placeholder="000000"
                    className="max-w-[160px] font-mono text-center tracking-widest"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setDesativarOpen(false)}
                    disabled={isPending}
                    className="cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={desativar}
                    disabled={isPending || !senha || tokenDes.length < 6}
                    className="gap-2 bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldOff className="h-4 w-4" />
                    )}
                    Desativar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
