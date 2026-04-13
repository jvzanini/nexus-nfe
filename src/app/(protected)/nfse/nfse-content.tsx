"use client";

import { useState, useEffect, useTransition, type ReactNode } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Plus,
  Loader2,
  Search,
  Filter,
  X,
  CircleHelp,
  List,
  Building2,
  User,
  Users,
  ChevronDown,
  ChevronRight,
  Eye,
  Download,
} from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { TutorialDialog } from "@/components/nfse/tutorial-dialog";
import { toast } from "sonner";
import { listarNfsesComFiltros, downloadXmlNfse, downloadPdfNfse, type NfseFilters, type NfseListItem } from "@/lib/actions/nfse";
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

function ActionIconButton({
  title,
  onClick,
  disabled = false,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
        disabled
          ? "border-border/40 text-muted-foreground/30 cursor-not-allowed"
          : "border-border text-muted-foreground hover:text-foreground hover:bg-accent/40 cursor-pointer"
      }`}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
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

function groupNfses(items: NfseListItem[], by: "none" | "empresa" | "tomador" | "grupo") {
  if (by === "none") return null;

  const groups = new Map<string, NfseListItem[]>();
  for (const item of items) {
    let key: string;
    if (by === "empresa") key = item.clienteMeiRazaoSocial;
    else if (by === "tomador") key = item.tomadorNome;
    else key = item.grupoEmpresarial || "Sem grupo";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

function GroupSection({
  name,
  items,
  router,
  groupBy,
  onDownloadXml,
  onDownloadPdf,
}: {
  name: string;
  items: NfseListItem[];
  router: ReturnType<typeof useRouter>;
  groupBy: "empresa" | "tomador" | "grupo";
  onDownloadXml: (id: string) => void;
  onDownloadPdf: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors cursor-pointer"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="font-medium text-foreground">{name}</span>
        <Badge variant="secondary" className="text-xs">{items.length}</Badge>
        <span className="ml-auto text-sm text-muted-foreground">
          {formatCurrency(
            items.reduce((sum, n) => sum + parseFloat(n.valorServico), 0).toString()
          )}
        </span>
      </button>
      {open && (
        <div className="border-t border-border overflow-x-auto">
          <Table>
            <TableBody>
              {items.map((n) => (
                <TableRow
                  key={n.id}
                  className="border-border hover:bg-accent/30 cursor-pointer"
                  onClick={() => router.push(`/nfse/${n.id}`)}
                >
                  <TableCell className="font-mono text-xs">{n.serie}-{n.numero}</TableCell>
                  {groupBy !== "empresa" && (
                    <TableCell className="font-medium">{n.clienteMeiRazaoSocial}</TableCell>
                  )}
                  <TableCell className="hidden md:table-cell max-w-[200px] truncate text-muted-foreground">
                    {n.descricaoServico}
                  </TableCell>
                  {groupBy !== "tomador" && (
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {n.tomadorNome}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-medium">
                    {formatCurrency(n.valorServico)}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={n.status} />
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground hidden sm:table-cell">
                    {format(new Date(n.dataEmissao), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <ActionIconButton
                        title="Visualizar"
                        onClick={() => router.push(`/nfse/${n.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </ActionIconButton>
                      <ActionIconButton
                        title="XML"
                        onClick={() => onDownloadXml(n.id)}
                        disabled={n.status !== "autorizada" && n.status !== "processando"}
                      >
                        <FileText className="h-4 w-4" />
                      </ActionIconButton>
                      <ActionIconButton
                        title="PDF"
                        onClick={() => onDownloadPdf(n.id)}
                        disabled={n.status !== "autorizada"}
                      >
                        <Download className="h-4 w-4" />
                      </ActionIconButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function NfseContent() {
  const [nfses, setNfses] = useState<NfseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, startDownloading] = useTransition();
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterEmpresa, setFilterEmpresa] = useState("");
  const [filterTomador, setFilterTomador] = useState("");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<"none" | "empresa" | "tomador" | "grupo">("none");

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

  function handleDownloadXml(id: string) {
    startDownloading(async () => {
      const result = await downloadXmlNfse(id);
      if (result.success && result.data) {
        const blob = new Blob([result.data.xml], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.data.filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        toast.error(result.error || "Erro ao baixar XML");
      }
    });
  }

  function handleDownloadPdf(id: string) {
    startDownloading(async () => {
      const result = await downloadPdfNfse(id);
      if (result.success && result.data) {
        const blob = new Blob(
          [Uint8Array.from(atob(result.data.pdf), (c) => c.charCodeAt(0))],
          { type: "application/pdf" }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.data.filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        toast.error(result.error || "Erro ao gerar PDF");
      }
    });
  }

  const uniqueTomadores = [...new Set(nfses.map((n) => n.tomadorNome))].sort();
  const uniqueEmpresas = [...new Set(nfses.map((n) => n.clienteMeiRazaoSocial))].sort();
  const tomadoresRecentes = Array.from(
    new Set(
      [...nfses]
        .sort((a, b) => new Date(b.dataEmissao).getTime() - new Date(a.dataEmissao).getTime())
        .map((n) => n.tomadorNome)
    )
  ).slice(0, 3);

  const filteredNfses = nfses.filter((n) => {
    if (filterEmpresa && n.clienteMeiRazaoSocial !== filterEmpresa) return false;
    if (filterTomador && n.tomadorNome !== filterTomador) return false;
    if (filterSearch) {
      return [n.clienteMeiRazaoSocial, n.tomadorNome, n.tomadorDocumento, n.descricaoServico, `${n.serie}-${n.numero}`]
        .some((field) => field?.toLowerCase().includes(filterSearch.toLowerCase()));
    }
    return true;
  });

  const grouped = groupNfses(filteredNfses, groupBy);

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
              <span className="hidden sm:inline">Nova NFS-e</span>
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Filtros */}
      <motion.div variants={itemVariants} className="flex items-start gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por empresa, tomador, número..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <CustomSelect
          value={filterStatus}
          onChange={setFilterStatus}
          triggerClassName="w-[180px]"
          options={[
            { value: "", label: "Todos os status" },
            {
              value: "rascunho",
              label: "Rascunho",
              icon: <span className="inline-flex rounded-full bg-zinc-500/20 px-2 py-0.5 text-[10px] text-zinc-400">Rascunho</span>,
            },
            {
              value: "pendente",
              label: "Pendente",
              icon: <span className="inline-flex rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-400">Pendente</span>,
            },
            {
              value: "processando",
              label: "Processando",
              icon: <span className="inline-flex rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400">Processando</span>,
            },
            {
              value: "autorizada",
              label: "Autorizada",
              icon: <span className="inline-flex rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">Autorizada</span>,
            },
            {
              value: "rejeitada",
              label: "Rejeitada",
              icon: <span className="inline-flex rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] text-red-400">Rejeitada</span>,
            },
            {
              value: "cancelada",
              label: "Cancelada",
              icon: <span className="inline-flex rounded-full bg-zinc-500/20 px-2 py-0.5 text-[10px] text-zinc-400">Cancelada</span>,
            },
            {
              value: "erro",
              label: "Erro",
              icon: <span className="inline-flex rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] text-red-400">Erro</span>,
            },
          ]}
        />
        <CustomSelect
          value={filterEmpresa}
          onChange={setFilterEmpresa}
          triggerClassName="w-[220px]"
          options={[
            { value: "", label: "Todas as empresas" },
            ...uniqueEmpresas.map((empresa) => ({ value: empresa, label: empresa })),
          ]}
        />
        <CustomSelect
          value={filterTomador}
          onChange={setFilterTomador}
          triggerClassName="w-[240px]"
          options={[
            { value: "", label: "Todos os tomadores" },
            ...uniqueTomadores.map((t) => ({
              value: t,
              label: t,
              description: tomadoresRecentes.includes(t) ? "Recente" : undefined,
            })),
          ]}
        />
        {/* Agrupamento */}
        <div className="flex items-center gap-1 rounded-xl border border-violet-500/20 bg-violet-500/5 p-1">
          <button
            onClick={() => setGroupBy("none")}
            className={`rounded px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
              groupBy === "none" ? "bg-violet-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
            title="Lista simples"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setGroupBy("empresa")}
            className={`rounded px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
              groupBy === "empresa" ? "bg-violet-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
            title="Agrupar por empresa"
          >
            <Building2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setGroupBy("tomador")}
            className={`rounded px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
              groupBy === "tomador" ? "bg-violet-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
            title="Agrupar por tomador"
          >
            <User className="h-4 w-4" />
          </button>
          <button
            onClick={() => setGroupBy("grupo")}
            className={`rounded px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
              groupBy === "grupo" ? "bg-violet-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
            title="Agrupar por grupo empresarial"
          >
            <Users className="h-4 w-4" />
          </button>
        </div>
      </motion.div>

      {/* Conteúdo */}
      {loading ? (
        <motion.div
          variants={itemVariants}
          className="rounded-xl border border-border bg-card/50 overflow-hidden"
        >
          <TableSkeleton />
        </motion.div>
      ) : filteredNfses.length === 0 ? (
        <motion.div
          variants={itemVariants}
          className="rounded-xl border border-border bg-card/50 overflow-hidden"
        >
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
        </motion.div>
      ) : grouped ? (
        <motion.div variants={itemVariants} className="space-y-3">
          {grouped.map(([name, items]) => (
            <GroupSection
              key={name}
              name={name}
              items={items}
              router={router}
              groupBy={groupBy as "empresa" | "tomador" | "grupo"}
              onDownloadXml={handleDownloadXml}
              onDownloadPdf={handleDownloadPdf}
            />
          ))}
        </motion.div>
      ) : (
        <motion.div
          variants={itemVariants}
          className="rounded-xl border border-border bg-card/50 overflow-hidden overflow-x-auto"
        >
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs uppercase text-muted-foreground font-medium">
                  Número
                </TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground font-medium">
                  Cliente
                </TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground font-medium hidden md:table-cell">
                  Serviço
                </TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground font-medium hidden lg:table-cell">
                  Tomador
                </TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground font-medium text-right">
                  Valor
                </TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground font-medium text-center">
                  Status
                </TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground font-medium text-right hidden sm:table-cell">
                  Data
                </TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground font-medium text-right">
                  Ações
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
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <ActionIconButton
                        title="Visualizar"
                        onClick={() => router.push(`/nfse/${n.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </ActionIconButton>
                      <ActionIconButton
                        title="XML"
                        onClick={() => handleDownloadXml(n.id)}
                        disabled={n.status !== "autorizada" && n.status !== "processando"}
                      >
                        <FileText className="h-4 w-4" />
                      </ActionIconButton>
                      <ActionIconButton
                        title="PDF"
                        onClick={() => handleDownloadPdf(n.id)}
                        disabled={n.status !== "autorizada"}
                      >
                        <Download className="h-4 w-4" />
                      </ActionIconButton>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </motion.div>
      )}
      <TutorialDialog open={tutorialOpen} onOpenChange={setTutorialOpen} />
    </motion.div>
  );
}
