"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarClock,
  ChevronLeft,
  Pause,
  PlayCircle,
  CheckCircle2,
  Zap,
  XCircle,
  Loader2,
  Eye,
  AlertTriangle,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  pausarAgendamento,
  retomarAgendamento,
  encerrarAgendamento,
  executarAgoraAgendamento,
  type AgendamentoDetalhe,
} from "@/lib/actions/nfse-agendamentos";

const STATUS: Record<string, { label: string; className: string; Icon: any }> = {
  ativo: {
    label: "Ativo",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    Icon: PlayCircle,
  },
  pausado: {
    label: "Pausado",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    Icon: Pause,
  },
  encerrado: {
    label: "Encerrado",
    className: "border-zinc-400/30 bg-zinc-500/10 text-muted-foreground",
    Icon: CheckCircle2,
  },
};

const FREQ_LABEL: Record<string, string> = {
  unica: "Única",
  mensal: "Mensal",
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

export function AgendamentoDetailContent({ initial }: { initial: AgendamentoDetalhe }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const a = initial;
  const cfg = STATUS[a.status] ?? STATUS.ativo;
  const Icon = cfg.Icon;

  function doPausar() {
    startTransition(async () => {
      const r = await pausarAgendamento(a.id);
      if (!r.success) {
        toast.error(r.error ?? "Erro");
        return;
      }
      toast.success("Agendamento pausado");
      router.refresh();
    });
  }
  function doRetomar() {
    startTransition(async () => {
      const r = await retomarAgendamento(a.id);
      if (!r.success) {
        toast.error(r.error ?? "Erro");
        return;
      }
      toast.success("Agendamento retomado");
      router.refresh();
    });
  }
  function doEncerrar() {
    if (!confirm("Encerrar este agendamento? Não será possível reativar.")) return;
    startTransition(async () => {
      const r = await encerrarAgendamento(a.id);
      if (!r.success) {
        toast.error(r.error ?? "Erro");
        return;
      }
      toast.success("Agendamento encerrado");
      router.refresh();
    });
  }
  function doExecutar() {
    startTransition(async () => {
      const r = await executarAgoraAgendamento(a.id);
      if (!r.success || !r.data) {
        toast.error(r.error ?? "Erro");
        return;
      }
      toast.success("NFS-e disparada");
      router.refresh();
    });
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/nfse/agendamentos">
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-[22%] bg-gradient-to-br from-violet-600 to-purple-600">
            <CalendarClock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{a.nome}</h1>
            <p className="text-xs text-muted-foreground">
              {a.clienteMeiRazaoSocial} · Tomador: {a.tomadorNome}
            </p>
          </div>
          <Badge variant="outline" className={`gap-1 ${cfg.className}`}>
            <Icon className="h-3 w-3" /> {cfg.label}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Repeat className="h-3 w-3" />
            {FREQ_LABEL[a.frequencia] ?? a.frequencia}
          </Badge>
        </div>
        <div className="flex gap-2 flex-wrap">
          {a.status === "ativo" && (
            <Button
              variant="outline"
              className="gap-2 cursor-pointer"
              onClick={doPausar}
              disabled={isPending}
            >
              <Pause className="h-4 w-4" /> Pausar
            </Button>
          )}
          {a.status === "pausado" && (
            <Button
              variant="outline"
              className="gap-2 cursor-pointer"
              onClick={doRetomar}
              disabled={isPending}
            >
              <PlayCircle className="h-4 w-4" /> Retomar
            </Button>
          )}
          {a.status !== "encerrado" && (
            <>
              <Button
                variant="outline"
                className="gap-2 cursor-pointer"
                onClick={doExecutar}
                disabled={isPending}
              >
                <Zap className="h-4 w-4" /> Executar agora
              </Button>
              <Button
                variant="outline"
                className="gap-2 cursor-pointer"
                onClick={doEncerrar}
                disabled={isPending}
              >
                <XCircle className="h-4 w-4" /> Encerrar
              </Button>
            </>
          )}
        </div>
      </div>

      {a.lastError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 flex gap-3 items-start">
          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <div className="text-sm text-red-600 dark:text-red-400">
            <p className="font-semibold">Último erro:</p>
            <p>{a.lastError}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card label="Emissões feitas" value={a.totalExecucoes} />
        <Card
          label="Próxima execução"
          value={format(new Date(a.proximaExecucao), "dd/MM HH:mm", { locale: ptBR })}
        />
        <Card
          label="Última execução"
          value={
            a.lastRunAt
              ? format(new Date(a.lastRunAt), "dd/MM HH:mm", { locale: ptBR })
              : "—"
          }
        />
        <Card
          label="Valor por emissão"
          value={`R$ ${Number(a.valorServico).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
        />
      </div>

      {/* Detalhes do template */}
      <div className="rounded-2xl border border-border bg-card p-5 grid gap-3 md:grid-cols-2 text-sm">
        <Detail label="Descrição" value={a.descricaoServico} />
        <Detail label="Código tributação" value={a.codigoTributacaoNacional} />
        <Detail label="Alíquota ISS" value={`${a.aliquotaIss}%`} />
        <Detail
          label="Tomador"
          value={`${a.tomadorNome} · ${a.tomadorDocumento}`}
        />
        {a.tomadorEmail && <Detail label="E-mail tomador" value={a.tomadorEmail} />}
        {a.dataFinal && (
          <Detail
            label="Data final"
            value={format(new Date(a.dataFinal), "dd/MM/yyyy", { locale: ptBR })}
          />
        )}
        {a.maxExecucoes && (
          <Detail label="Máx. execuções" value={String(a.maxExecucoes)} />
        )}
      </div>

      {/* Histórico */}
      <div>
        <h2 className="text-base font-semibold mb-3">Histórico de execuções</h2>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Data</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {a.execucoes.map((e) => (
                <tr key={e.id} className="border-t border-border/60">
                  <td className="px-3 py-2">
                    {format(new Date(e.executadoEm), "dd/MM/yyyy HH:mm", {
                      locale: ptBR,
                    })}
                  </td>
                  <td className="px-3 py-2">
                    {e.sucesso ? (
                      <span className="text-emerald-500 inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> NFS-e criada
                      </span>
                    ) : (
                      <span className="text-red-500 inline-flex items-center gap-1">
                        <XCircle className="h-3.5 w-3.5" /> Falhou
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {e.sucesso && e.nfseId ? (
                      <Link
                        href={`/nfse/${e.nfseId}`}
                        className="inline-flex items-center gap-1 text-violet-500 hover:text-violet-400"
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver NFS-e
                      </Link>
                    ) : (
                      <span className="text-xs text-red-500">{e.erro ?? "—"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {a.execucoes.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma execução ainda.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold truncate">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium break-words">{value}</p>
    </div>
  );
}
