"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FileStack,
  ChevronLeft,
  RotateCcw,
  Download,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CircleDashed,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  cancelarLote,
  reprocessarRejeitadas,
  exportarResultadoCsv,
  type LoteDetalhe,
} from "@/lib/actions/nfse-lote";

const STATUS_CFG: Record<string, { label: string; className: string; Icon: any }> = {
  pendente: {
    label: "Pendente",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    Icon: Clock,
  },
  processando: {
    label: "Processando",
    className: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    Icon: CircleDashed,
  },
  autorizado: {
    label: "Autorizada",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    Icon: CheckCircle2,
  },
  rejeitado: {
    label: "Rejeitada",
    className: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
    Icon: XCircle,
  },
  erro: {
    label: "Erro",
    className: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
    Icon: AlertTriangle,
  },
  cancelado: {
    label: "Cancelado",
    className: "border-zinc-400/30 bg-zinc-500/10 text-muted-foreground",
    Icon: XCircle,
  },
  concluido: {
    label: "Concluído",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    Icon: CheckCircle2,
  },
};

export function LoteDetailContent({ initial }: { initial: LoteDetalhe }) {
  const router = useRouter();
  const [lote, setLote] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<string>("todos");

  // Polling enquanto não-terminal
  useEffect(() => {
    if (lote.status !== "pendente" && lote.status !== "processando") return;
    const id = setInterval(() => {
      router.refresh();
    }, 5000);
    return () => clearInterval(id);
  }, [lote.status, router]);

  // Atualiza dados quando initial mudar (após refresh do server component)
  useEffect(() => {
    setLote(initial);
  }, [initial]);

  const progresso =
    lote.totalItens > 0
      ? Math.round(
          ((lote.stats.autorizadas + lote.stats.rejeitadas + lote.stats.cancelados) /
            lote.totalItens) *
            100
        )
      : 0;

  const cfg = STATUS_CFG[lote.status] ?? STATUS_CFG.pendente;
  const StatusIcon = cfg.Icon;

  const temRejeitados = lote.itens.some(
    (it) => it.status === "rejeitado" || it.status === "erro"
  );

  function doCancelar() {
    if (!confirm("Cancelar todos os itens pendentes deste lote?")) return;
    startTransition(async () => {
      const r = await cancelarLote(lote.id);
      if (!r.success) {
        toast.error(r.error ?? "Erro ao cancelar");
        return;
      }
      toast.success(`${r.data?.cancelados ?? 0} itens cancelados`);
      router.refresh();
    });
  }

  function doReprocessar() {
    startTransition(async () => {
      const r = await reprocessarRejeitadas(lote.id);
      if (!r.success) {
        toast.error(r.error ?? "Erro ao reprocessar");
        return;
      }
      toast.success(`${r.data?.reprocessados ?? 0} itens reenfileirados`);
      router.refresh();
    });
  }

  function doExportar() {
    startTransition(async () => {
      const r = await exportarResultadoCsv(lote.id);
      if (!r.success || !r.data) {
        toast.error(r.error ?? "Erro ao exportar");
        return;
      }
      const blob = new Blob([r.data], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lote-${lote.id.slice(0, 8)}-resultado.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const itensFiltrados =
    filter === "todos" ? lote.itens : lote.itens.filter((it) => it.status === filter);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/nfse/lote">
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-[22%] bg-gradient-to-br from-violet-600 to-purple-600">
            <FileStack className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {lote.nomeArquivo ?? `Lote ${lote.id.slice(0, 8)}`}
            </h1>
            <p className="text-xs text-muted-foreground">
              {lote.clienteMeiRazaoSocial} ·{" "}
              {format(new Date(lote.createdAt), "dd 'de' MMM 'às' HH:mm", {
                locale: ptBR,
              })}
            </p>
          </div>
          <Badge variant="outline" className={`gap-1 ${cfg.className}`}>
            <StatusIcon className="h-3 w-3" />
            {cfg.label}
          </Badge>
        </div>
        <div className="flex gap-2">
          {lote.status === "pendente" && (
            <Button
              variant="outline"
              className="gap-2 cursor-pointer"
              onClick={doCancelar}
              disabled={isPending}
            >
              <XCircle className="h-4 w-4" /> Cancelar
            </Button>
          )}
          {temRejeitados && lote.status !== "cancelado" && (
            <Button
              variant="outline"
              className="gap-2 cursor-pointer"
              onClick={doReprocessar}
              disabled={isPending}
            >
              <RotateCcw className="h-4 w-4" /> Reprocessar rejeitadas
            </Button>
          )}
          <Button
            variant="outline"
            className="gap-2 cursor-pointer"
            onClick={doExportar}
            disabled={isPending}
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Progresso */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progresso</span>
          <span>{progresso}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-violet-500 transition-all duration-500"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard label="Total" value={lote.totalItens} color="text-foreground" />
        <StatCard
          label="Autorizadas"
          value={lote.stats.autorizadas}
          color="text-emerald-500"
        />
        <StatCard
          label="Rejeitadas"
          value={lote.stats.rejeitadas}
          color="text-red-500"
        />
        <StatCard
          label="Pendentes"
          value={lote.stats.pendentes}
          color="text-amber-500"
        />
      </div>

      {/* Filtro */}
      <div className="flex gap-2 flex-wrap">
        {["todos", "pendente", "processando", "autorizado", "rejeitado", "erro", "cancelado"].map(
          (s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                filter === s
                  ? "border-violet-500 bg-violet-500/10 text-violet-500"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "todos" ? "Todos" : STATUS_CFG[s]?.label ?? s}
            </button>
          )
        )}
      </div>

      {/* Tabela */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Linha</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Documento</th>
              <th className="text-left px-3 py-2">Tomador</th>
              <th className="text-right px-3 py-2">Valor</th>
              <th className="text-left px-3 py-2">Erro / Ação</th>
            </tr>
          </thead>
          <tbody>
            {itensFiltrados.slice(0, 200).map((it) => {
              const st = STATUS_CFG[it.status] ?? STATUS_CFG.pendente;
              const Icon = st.Icon;
              return (
                <tr key={it.id} className="border-t border-border/60">
                  <td className="px-3 py-2">{it.linhaCsv}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={`gap-1 ${st.className}`}>
                      <Icon className="h-3 w-3" />
                      {st.label}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {it.tomadorDocumento}
                  </td>
                  <td className="px-3 py-2">{it.tomadorNome}</td>
                  <td className="px-3 py-2 text-right">
                    R${" "}
                    {Number(it.valorServico).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-3 py-2">
                    {it.status === "autorizado" && it.nfseId ? (
                      <Link
                        href={`/nfse/${it.nfseId}`}
                        className="inline-flex items-center gap-1 text-violet-500 hover:text-violet-400"
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver NFS-e
                      </Link>
                    ) : (
                      <span
                        className="text-xs text-red-500 truncate max-w-[260px] inline-block"
                        title={it.erro ?? ""}
                      >
                        {it.erro ?? "—"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {itensFiltrados.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Nenhum item neste filtro.
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
