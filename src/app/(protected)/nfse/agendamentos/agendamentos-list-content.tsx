"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  CalendarClock,
  Plus,
  ChevronRight,
  Pause,
  CheckCircle2,
  PlayCircle,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AgendamentoListItem } from "@/lib/actions/nfse-agendamentos";

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

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

export function AgendamentosListContent({
  initial,
}: {
  initial: AgendamentoListItem[];
}) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div
        variants={item}
        className="flex items-start sm:items-center justify-between gap-3 flex-wrap"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[22%] bg-gradient-to-br from-violet-600 to-purple-600 shadow-[0_0_12px_rgba(124,58,237,0.3)]">
            <CalendarClock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Agendamentos de NFS-e
            </h1>
            <p className="text-sm text-muted-foreground">
              Emissão automática recorrente (mensal, anual, etc.)
            </p>
          </div>
        </div>
        <Link href="/nfse/agendamentos/novo">
          <Button className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer">
            <Plus className="h-4 w-4" /> Novo agendamento
          </Button>
        </Link>
      </motion.div>

      {initial.length === 0 ? (
        <motion.div
          variants={item}
          className="rounded-2xl border border-dashed border-border/80 py-16 text-center"
        >
          <CalendarClock className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhum agendamento criado.
          </p>
          <Link href="/nfse/agendamentos/novo">
            <Button className="mt-4 gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer">
              <Plus className="h-4 w-4" /> Criar primeiro agendamento
            </Button>
          </Link>
        </motion.div>
      ) : (
        <motion.div
          variants={container}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {initial.map((a) => {
            const cfg = STATUS[a.status] ?? STATUS.ativo;
            const Icon = cfg.Icon;
            return (
              <motion.div key={a.id} variants={item}>
                <Link
                  href={`/nfse/agendamentos/${a.id}`}
                  className="group relative block rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:shadow-[0_0_24px_rgba(124,58,237,0.18)] hover:border-violet-500/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500 shrink-0">
                      <Repeat className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold">
                          {a.nome}
                        </h3>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-violet-500 transition-colors shrink-0" />
                      </div>
                      <p className="truncate text-xs text-muted-foreground mt-0.5">
                        {a.clienteMeiRazaoSocial} · {a.tomadorNome}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`gap-1 ${cfg.className}`}>
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {FREQ_LABEL[a.frequencia] ?? a.frequencia}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Próxima</p>
                          <p className="font-medium">
                            {format(new Date(a.proximaExecucao), "dd MMM HH:mm", {
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Emitidas</p>
                          <p className="font-medium">{a.totalExecucoes}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
