"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileStack,
  Plus,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  CircleDashed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { LoteListItem } from "@/lib/actions/nfse-lote";

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

const STATUS: Record<string, { label: string; className: string; Icon: any }> = {
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
  concluido: {
    label: "Concluído",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    Icon: CheckCircle2,
  },
  cancelado: {
    label: "Cancelado",
    className: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
    Icon: XCircle,
  },
};

export function LoteListContent({ initialLotes }: { initialLotes: LoteListItem[] }) {
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
            <FileStack className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Emissão em Lote</h1>
            <p className="text-sm text-muted-foreground">
              Emita várias NFS-e a partir de um arquivo CSV
            </p>
          </div>
        </div>
        <Link href="/nfse/lote/novo">
          <Button className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer">
            <Plus className="h-4 w-4" /> Novo lote
          </Button>
        </Link>
      </motion.div>

      {initialLotes.length === 0 ? (
        <motion.div
          variants={item}
          className="rounded-2xl border border-dashed border-border/80 py-16 text-center"
        >
          <FileStack className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhum lote criado ainda.
          </p>
          <Link href="/nfse/lote/novo">
            <Button className="mt-4 gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer">
              <Plus className="h-4 w-4" /> Criar primeiro lote
            </Button>
          </Link>
        </motion.div>
      ) : (
        <motion.div
          variants={container}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {initialLotes.map((l) => {
            const cfg = STATUS[l.status] ?? STATUS.pendente;
            const Icon = cfg.Icon;
            return (
              <motion.div key={l.id} variants={item}>
                <Link
                  href={`/nfse/lote/${l.id}`}
                  className="group relative block rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:shadow-[0_0_24px_rgba(124,58,237,0.18)] hover:border-violet-500/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500 shrink-0">
                      <FileStack className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold">
                          {l.nomeArquivo ?? `Lote ${l.id.slice(0, 8)}`}
                        </h3>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-violet-500 transition-colors shrink-0" />
                      </div>
                      <p className="truncate text-xs text-muted-foreground mt-0.5">
                        {l.clienteMeiRazaoSocial}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <Badge variant="outline" className={`gap-1 ${cfg.className}`}>
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center gap-3 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <span className="font-semibold text-foreground">
                            {l.totalItens}
                          </span>
                          <span className="text-muted-foreground">total</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          {l.autorizadas}
                        </span>
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                          <XCircle className="h-3 w-3" />
                          {l.rejeitadas}
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {format(new Date(l.createdAt), "dd 'de' MMM 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
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
