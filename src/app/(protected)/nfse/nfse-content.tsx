"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Plus, Loader2, Search, Filter, X, CircleHelp } from "lucide-react";
import { TutorialDialog } from "@/components/nfse/tutorial-dialog";
import { toast } from "sonner";
import { listarNfsesComFiltros, type NfseFilters, type NfseListItem } from "@/lib/actions/nfse";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  rascunho: {
    label: "Rascunho",
    className:
      "border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-muted-foreground",
  },
  pendente: {
    label: "Pendente",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  processando: {
    label: "Processando",
    className:
      "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  autorizada: {
    label: "Autorizada",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  rejeitada: {
    label: "Rejeitada",
    className:
      "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  },
  cancelada: {
    label: "Cancelada",
    className:
      "border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-muted-foreground",
  },
  erro: {
    label: "Erro",
    className:
      "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.rascunho;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-lg bg-muted/50 border border-border"
        />
      ))}
    </div>
  );
}

function formatCurrency(value: string) {
  const num = parseFloat(value);
  if (isNaN(num)) return "R$ 0,00";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function NfseContent() {
  const [nfses, setNfses] = useState<NfseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [tutorialOpen, setTutorialOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        router.push("/nfse/nova");
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  async function loadNfses() {
    const filters: NfseFilters = {};
    if (filterStatus) filters.status = filterStatus;
    const result = await listarNfsesComFiltros(filters);
    if (result.success && result.data) {
      setNfses(result.data);
    } else {
      toast.error(result.error || "Erro ao carregar notas fiscais");
    }
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setLoading(true);
    loadNfses();
  }, [filterStatus]);

  const filteredNfses = filterSearch
    ? nfses.filter((n) =>
        [n.clienteMeiRazaoSocial, n.tomadorNome, n.tomadorDocumento, n.descricaoServico, `${n.serie}-${n.numero}`]
          .some((field) => field?.toLowerCase().includes(filterSearch.toLowerCase()))
      )
    : nfses;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/10 border border-violet-500/20">
            <FileText className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Notas Fiscais
            </h1>
            <p className="text-sm text-muted-foreground">
              NFS-e emitidas pela plataforma
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTutorialOpen(true)}
            className="cursor-pointer"
            title="Como funciona?"
          >
            <CircleHelp className="h-4 w-4" />
          </Button>
          <Link href="/nfse/nova">
            <Button className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer transition-all duration-200" title="Ctrl+N">
              <Plus className="h-4 w-4" />
              Nova NFS-e
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Filtros */}
      <motion.div variants={itemVariants} className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CNPJ..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          {["", "rascunho", "pendente", "processando", "autorizada", "rejeitada", "erro"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors cursor-pointer ${
                filterStatus === s
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-transparent text-muted-foreground border-border hover:border-violet-500/50"
              }`}
            >
              {s === "" ? "Todos" : (statusConfig[s]?.label ?? s)}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        variants={itemVariants}
        className="rounded-xl border border-border bg-card/50 overflow-hidden overflow-x-auto"
      >
        {loading ? (
          <TableSkeleton />
        ) : filteredNfses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mb-3 text-muted-foreground/60" />
            <p className="text-sm">Nenhuma nota fiscal encontrada</p>
            <p className="text-xs mt-1">
              Emita a primeira NFS-e clicando no botão acima
            </p>
            <Link href="/nfse/nova">
              <Button variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Nova NFS-e
              </Button>
            </Link>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">
                  Número
                </TableHead>
                <TableHead className="text-muted-foreground">
                  Cliente
                </TableHead>
                <TableHead className="text-muted-foreground hidden md:table-cell">
                  Serviço
                </TableHead>
                <TableHead className="text-muted-foreground hidden lg:table-cell">
                  Tomador
                </TableHead>
                <TableHead className="text-muted-foreground text-right">
                  Valor
                </TableHead>
                <TableHead className="text-muted-foreground text-center">
                  Status
                </TableHead>
                <TableHead className="text-muted-foreground text-right hidden sm:table-cell">
                  Data
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNfses.map((n, index) => (
                <motion.tr
                  key={n.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: index * 0.03,
                    ease: "easeOut" as const,
                  }}
                  className="border-border hover:bg-accent/30 transition-colors duration-200 cursor-pointer"
                  onClick={() => router.push(`/nfse/${n.id}`)}
                >
                  <TableCell className="font-mono text-xs text-foreground">
                    {n.serie}-{n.numero}
                  </TableCell>
                  <TableCell className="text-foreground font-medium">
                    {n.clienteMeiRazaoSocial}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                    {n.descricaoServico}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden lg:table-cell">
                    {n.tomadorNome}
                  </TableCell>
                  <TableCell className="text-right text-foreground font-medium">
                    {formatCurrency(n.valorServico)}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={n.status} />
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm hidden sm:table-cell">
                    {format(new Date(n.dataEmissao), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        )}
      </motion.div>
      <TutorialDialog open={tutorialOpen} onOpenChange={setTutorialOpen} />
    </motion.div>
  );
}
