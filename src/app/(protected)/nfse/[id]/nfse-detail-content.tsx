"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, FileText, Download, Building2, User,
  Calculator, Clock, AlertTriangle, CheckCircle2, XCircle, Copy, RotateCcw,
  Ban, Replace, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getNfseDetail, downloadXmlNfse, cancelarNfse, substituirNfse, type NfseDetail } from "@/lib/actions/nfse";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  rascunho: {
    label: "Rascunho",
    className: "border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-muted-foreground",
  },
  pendente: {
    label: "Pendente",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  processando: {
    label: "Processando",
    className: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  autorizada: {
    label: "Autorizada",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  rejeitada: {
    label: "Rejeitada",
    className: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  },
  cancelada: {
    label: "Cancelada",
    className: "border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-muted-foreground",
  },
  erro: {
    label: "Erro",
    className: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.rascunho;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function formatCurrency(value: string) {
  const num = parseFloat(value);
  if (isNaN(num)) return "R$ 0,00";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDoc(doc: string) {
  const d = doc.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return doc;
}

function formatDate(date: Date | null) {
  if (!date) return "—";
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground font-medium">{value ?? "—"}</p>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "autorizada") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "rejeitada" || status === "erro") return <XCircle className="h-4 w-4 text-red-500" />;
  if (status === "processando") return <Clock className="h-4 w-4 text-blue-500" />;
  if (status === "pendente") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

export function NfseDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const [nfse, setNfse] = useState<NfseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [cancelling, startCancelling] = useTransition();

  function loadNfse() {
    getNfseDetail(id).then((result) => {
      if (result.success && result.data) {
        setNfse(result.data);
      } else {
        toast.error(result.error ?? "Erro ao carregar NFS-e");
      }
      setLoading(false);
    });
  }

  useEffect(() => {
    getNfseDetail(id).then((result) => {
      if (result.success && result.data) {
        setNfse(result.data);
      } else {
        toast.error(result.error ?? "Erro ao carregar NFS-e");
      }
      setLoading(false);
    });
  }, [id]);

  async function handleDownloadXml() {
    if (!nfse) return;
    setDownloading(true);
    const result = await downloadXmlNfse(id);
    setDownloading(false);
    if (!result.success || !result.data) {
      toast.error(result.error ?? "Erro ao baixar XML");
      return;
    }
    const blob = new Blob([result.data.xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.data.filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("XML baixado com sucesso");
  }

  async function handleCopyChave() {
    if (!nfse?.chaveAcesso) return;
    await navigator.clipboard.writeText(nfse.chaveAcesso);
    toast.success("Chave copiada");
  }

  function handleCancelar() {
    startCancelling(async () => {
      const result = await cancelarNfse(id, cancelMotivo);
      if (result.success) {
        toast.success("NFS-e cancelada com sucesso");
        setCancelOpen(false);
        loadNfse();
      } else {
        toast.error(result.error || "Erro ao cancelar");
      }
    });
  }

  function handleSubstituir() {
    startCancelling(async () => {
      const result = await substituirNfse(id);
      if (result.success && result.data) {
        toast.success("Rascunho de substituição criado");
        router.push(`/nfse/${result.data.id}`);
      } else {
        toast.error(result.error || "Erro ao substituir");
      }
    });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-muted/50 border border-border" />
        ))}
      </div>
    );
  }

  if (!nfse) return null;

  const canDownloadXml = !!(nfse.xmlAutorizado || nfse.xmlAssinado);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Cabeçalho */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/nfse">
            <Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/10 border border-violet-500/20">
            <FileText className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground font-mono">
                NFS-e {nfse.serie}-{nfse.numero}
              </h1>
              <StatusBadge status={nfse.status} />
            </div>
            <p className="text-sm text-muted-foreground">{nfse.clienteMeiRazaoSocial}</p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2 sm:ml-auto">
          {nfse.status === "autorizada" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelOpen(true)}
                className="gap-2 cursor-pointer text-red-500 hover:text-red-600 border-red-500/30 hover:border-red-500/50"
              >
                <Ban className="h-4 w-4" />
                Cancelar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSubstituir}
                disabled={cancelling}
                className="gap-2 cursor-pointer"
              >
                <Replace className="h-4 w-4" />
                Substituir
              </Button>
            </>
          )}
          {["autorizada", "rejeitada", "erro"].includes(nfse.status) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/nfse/nova?reemitir=${nfse.id}`)}
              className="gap-2 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Emitir novamente
            </Button>
          )}
          {nfse.chaveAcesso && (
            <Button variant="outline" size="sm" className="gap-2 cursor-pointer" onClick={handleCopyChave}>
              <Copy className="h-4 w-4" />
              Copiar chave
            </Button>
          )}
          <Button
            size="sm"
            className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
            disabled={!canDownloadXml || downloading}
            onClick={handleDownloadXml}
          >
            <Download className="h-4 w-4" />
            {downloading ? "Baixando…" : "Baixar XML"}
          </Button>
        </div>
      </motion.div>

      {/* Grade de cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Cliente */}
        <motion.div variants={itemVariants}>
          <Card className="border-border bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Building2 className="h-4 w-4 text-violet-400" />
                Cliente MEI
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Field label="Razão Social" value={nfse.clienteMeiRazaoSocial} />
              <Field label="ID DPS" value={<span className="font-mono text-xs break-all">{nfse.idDps}</span>} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Tomador */}
        <motion.div variants={itemVariants}>
          <Card className="border-border bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <User className="h-4 w-4 text-violet-400" />
                Tomador
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Field label="Nome" value={nfse.tomadorNome} />
              <Field label="Documento" value={formatDoc(nfse.tomadorDocumento)} />
              <Field label="Tipo" value={nfse.tomadorTipo === "PF" ? "Pessoa Física" : "Pessoa Jurídica"} />
              {nfse.tomadorEmail && <Field label="E-mail" value={nfse.tomadorEmail} />}
            </CardContent>
          </Card>
        </motion.div>

        {/* Serviço */}
        <motion.div variants={itemVariants}>
          <Card className="border-border bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <FileText className="h-4 w-4 text-violet-400" />
                Serviço
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Field label="Descrição" value={nfse.descricaoServico} />
              <Field label="Código tributação" value={nfse.codigoServico} />
              {nfse.codigoNbs && <Field label="Código NBS" value={nfse.codigoNbs} />}
              <Field label="IBGE prestação" value={nfse.localPrestacaoIbge} />
              <Field label="Competência" value={format(new Date(nfse.dataCompetencia), "MM/yyyy", { locale: ptBR })} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Valores */}
        <motion.div variants={itemVariants}>
          <Card className="border-border bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Calculator className="h-4 w-4 text-violet-400" />
                Valores
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Field label="Valor do serviço" value={formatCurrency(nfse.valorServico)} />
              <Field label="Alíquota ISS" value={`${parseFloat(nfse.aliquotaIss).toFixed(2)}%`} />
              <Field label="Valor ISS" value={formatCurrency(nfse.valorIss)} />
              {nfse.numeroNfse && <Field label="Número NFS-e" value={nfse.numeroNfse} />}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Status / Timeline */}
      <motion.div variants={itemVariants}>
        <Card className="border-border bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <StatusIcon status={nfse.status} />
              Status &amp; Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Ambiente" value={nfse.ambiente === "producao_restrita" ? "Produção Restrita" : "Produção"} />
            <Field label="Data de emissão" value={formatDate(nfse.dataEmissao)} />
            <Field label="Data de autorização" value={formatDate(nfse.dataAutorizacao)} />
            <Field label="Tentativas" value={String(nfse.tentativas)} />
            {nfse.codigoResposta && <Field label="Código resposta" value={nfse.codigoResposta} />}
            {nfse.mensagemResposta && <Field label="Mensagem resposta" value={nfse.mensagemResposta} />}
            {nfse.chaveAcesso && (
              <div className="sm:col-span-2 lg:col-span-3 space-y-1">
                <p className="text-xs text-muted-foreground">Chave de acesso</p>
                <p className="text-xs font-mono text-foreground break-all">{nfse.chaveAcesso}</p>
              </div>
            )}
            {nfse.ultimoErro && (
              <div className="sm:col-span-2 lg:col-span-3 space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  Último erro
                </p>
                <p className="text-xs text-red-500 dark:text-red-400 break-all">{nfse.ultimoErro}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar NFS-e</DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. A NFS-e será marcada como cancelada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="motivo">Motivo do cancelamento</Label>
            <Input
              id="motivo"
              value={cancelMotivo}
              onChange={(e) => setCancelMotivo(e.target.value)}
              placeholder="Descreva o motivo (mínimo 5 caracteres)"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} className="cursor-pointer">
              Voltar
            </Button>
            <Button
              onClick={handleCancelar}
              disabled={cancelling || cancelMotivo.trim().length < 5}
              className="gap-2 bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
