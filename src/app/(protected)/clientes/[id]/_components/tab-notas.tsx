"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Eye, Download, FileText, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomSelect } from "@/components/ui/custom-select";
import { toast } from "sonner";
import {
  listarNfses,
  downloadXmlNfse,
  downloadPdfNfse,
  type NfseListItem,
} from "@/lib/actions/nfse";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TabNotasProps {
  empresaId: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  rascunho: {
    label: "Rascunho",
    className:
      "border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-muted-foreground",
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
  erro: {
    label: "Erro",
    className:
      "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  },
  cancelada: {
    label: "Cancelada",
    className:
      "border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-muted-foreground",
  },
  pendente: {
    label: "Pendente",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
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

export function TabNotas({ empresaId }: TabNotasProps) {
  const router = useRouter();
  const [nfses, setNfses] = useState<NfseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, startDownloading] = useTransition();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    listarNfses(empresaId).then((result) => {
      if (result.success && result.data) {
        setNfses(result.data);
      }
      setLoading(false);
    });
  }, [empresaId]);

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

  const filtered = nfses.filter((n) => {
    if (filterStatus && n.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return [n.tomadorNome, n.descricaoServico, `${n.serie}-${n.numero}`]
        .some((f) => f?.toLowerCase().includes(q));
    }
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
        <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-5 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground/80">
            {nfses.length} {nfses.length === 1 ? "nota fiscal" : "notas fiscais"}
          </h3>
        </div>
        <Link href="/nfse/nova">
          <Button size="sm" className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer">
            <Plus className="h-4 w-4" />
            Nova NFS-e
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      {nfses.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[160px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por tomador, serviço, número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <CustomSelect
            value={filterStatus}
            onChange={setFilterStatus}
            triggerClassName="w-[180px]"
            options={[
              { value: "", label: "Todos os status" },
              { value: "rascunho", label: "Rascunho" },
              { value: "pendente", label: "Pendente" },
              { value: "processando", label: "Processando" },
              { value: "autorizada", label: "Autorizada" },
              { value: "rejeitada", label: "Rejeitada" },
              { value: "cancelada", label: "Cancelada" },
              { value: "erro", label: "Erro" },
            ]}
          />
        </div>
      )}

      {/* Tabela ou empty state */}
      <div className="rounded-xl border border-border bg-card/50 overflow-hidden overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="size-10 mb-3 text-muted-foreground/60" />
            <p className="text-sm">
              {nfses.length === 0
                ? "Nenhuma nota fiscal emitida"
                : "Nenhuma nota fiscal encontrada"}
            </p>
            {nfses.length === 0 && (
              <p className="text-xs mt-1">
                Emita a primeira NFS-e desta empresa
              </p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs uppercase text-muted-foreground font-medium">Número</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground font-medium">Serviço</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground font-medium">Tomador</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground font-medium text-right">Valor</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground font-medium text-center">Status</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground font-medium">Data</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground font-medium text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((n) => (
                <TableRow
                  key={n.id}
                  className="hover:bg-accent/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/nfse/${n.id}`)}
                >
                  <TableCell className="text-foreground font-mono text-xs">
                    {n.serie}-{n.numero}
                  </TableCell>
                  <TableCell className="text-foreground max-w-[200px] truncate">
                    {n.descricaoServico}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {n.tomadorNome}
                  </TableCell>
                  <TableCell className="text-right text-foreground tabular-nums">
                    {Number(n.valorServico).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={n.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {format(n.dataEmissao, "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div
                      className="flex items-center justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => router.push(`/nfse/${n.id}`)}
                        className="cursor-pointer text-muted-foreground hover:text-foreground"
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadXml(n.id)}
                        className={
                          n.status === "autorizada" || n.status === "processando"
                            ? "cursor-pointer text-muted-foreground hover:text-foreground"
                            : "text-zinc-800 cursor-not-allowed"
                        }
                        title="XML"
                        disabled={n.status !== "autorizada" && n.status !== "processando"}
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(n.id)}
                        className={
                          n.status === "autorizada"
                            ? "cursor-pointer text-muted-foreground hover:text-foreground"
                            : "text-zinc-800 cursor-not-allowed"
                        }
                        title="PDF"
                        disabled={n.status !== "autorizada"}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
